// ═══════════════════════════════════════════════════════════════
// app/api/chart-to-image/route.ts
// Converts inline HTML charts to PNG images for email embedding.
// Uses the same Puppeteer infrastructure as the PDF export route.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// ── Puppeteer import strategy (same as export-pdf/route.ts) ──
let puppeteerModule: any = null;
let chromiumModule: any = null;

async function getBrowser() {
  // Production (Vercel serverless)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    if (!chromiumModule) chromiumModule = (await import('@sparticuz/chromium')).default;
    if (!puppeteerModule) puppeteerModule = (await import('puppeteer-core')).default;
    return puppeteerModule.launch({
      args: chromiumModule.args,
      defaultViewport: { width: 600, height: 400 },
      executablePath: await chromiumModule.executablePath(),
      headless: true,
    });
  }

  // Development (local Puppeteer with bundled Chromium)
  if (!puppeteerModule) {
    try {
      puppeteerModule = (await import('puppeteer')).default;
    } catch {
      puppeteerModule = (await import('puppeteer-core')).default;
    }
  }
  return puppeteerModule.launch({
    headless: true,
    defaultViewport: { width: 600, height: 400 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

// ── Chart HTML → full document wrapper ──
function wrapChartHTML(chartHTML: string, maxWidth: number = 560): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFFFFF;
      padding: 16px;
      max-width: ${maxWidth}px;
    }
    table { border-collapse: collapse; }
    /* Ensure all chart elements render with correct background colors */
    div, td, th, span { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${chartHTML}</body>
</html>`;
}

// ── POST handler ──
export async function POST(request: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chart_html, section_id, width = 560, quality = 90 } = body;

    if (!chart_html || typeof chart_html !== 'string') {
      return NextResponse.json({ error: 'chart_html is required' }, { status: 400 });
    }

    // Launch browser
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport to match email container width
    await page.setViewport({ width: width + 32, height: 800 }); // +32 for padding

    // Load the chart HTML
    const fullHTML = wrapChartHTML(chart_html, width);
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

    // Wait for any CSS transitions/animations to settle
    await page.waitForTimeout(200);

    // Get the actual content height (auto-size)
    const bodyHandle = await page.$('body');
    const boundingBox = await bodyHandle?.boundingBox();
    const contentHeight = Math.ceil(boundingBox?.height || 400);

    // Resize viewport to exact content height
    await page.setViewport({ width: width + 32, height: contentHeight + 32 });

    // Screenshot with transparent background for clean embedding
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: width + 32,
        height: contentHeight + 32,
      },
      omitBackground: false, // keep white background
    });

    await browser.close();

    // Return as PNG binary
    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="chart-${section_id || 'unknown'}.png"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Section-Id': section_id || '',
      },
    });

  } catch (error: any) {
    console.error('[chart-to-image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to render chart image', details: error?.message },
      { status: 500 }
    );
  }
}

// ── Batch endpoint: multiple charts in one request ──
// Use this when exporting a full report to avoid launching
// multiple browser instances.
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { charts } = body; // Array of { section_id, chart_html }

    if (!Array.isArray(charts) || charts.length === 0) {
      return NextResponse.json({ error: 'charts array is required' }, { status: 400 });
    }

    // Limit batch size
    if (charts.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 charts per batch' }, { status: 400 });
    }

    const browser = await getBrowser();
    const results: Array<{ section_id: string; image_base64: string; width: number; height: number }> = [];

    for (const chart of charts) {
      const page = await browser.newPage();

      try {
        const width = 560;
        await page.setViewport({ width: width + 32, height: 800 });

        const fullHTML = wrapChartHTML(chart.chart_html, width);
        await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(150);

        const bodyHandle = await page.$('body');
        const boundingBox = await bodyHandle?.boundingBox();
        const contentHeight = Math.ceil(boundingBox?.height || 400);

        await page.setViewport({ width: width + 32, height: contentHeight + 32 });

        const screenshotBuffer = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: width + 32, height: contentHeight + 32 },
          omitBackground: false,
          encoding: 'base64',
        });

        results.push({
          section_id: chart.section_id,
          image_base64: screenshotBuffer as string,
          width: width + 32,
          height: contentHeight + 32,
        });
      } finally {
        await page.close();
      }
    }

    await browser.close();

    return NextResponse.json({ images: results });

  } catch (error: any) {
    console.error('[chart-to-image] Batch error:', error);
    return NextResponse.json(
      { error: 'Failed to render chart images', details: error?.message },
      { status: 500 }
    );
  }
}
