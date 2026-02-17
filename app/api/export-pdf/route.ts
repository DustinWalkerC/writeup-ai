/**
 * POST /api/export-pdf
 *
 * Generates a PDF from raw HTML using headless Chrome (Puppeteer).
 * This produces pixel-perfect output because Chrome's native print
 * engine handles CSS page-break, flexbox, grid, background colors,
 * and SVG charts correctly — unlike canvas-based libraries.
 *
 * Body: { html: string }
 * Returns: PDF binary (application/pdf)
 */

import { NextRequest, NextResponse } from 'next/server'

// Dynamically import so the app still builds even if
// puppeteer-core isn't installed yet (graceful degradation).
async function getBrowser() {
  // In production (Vercel), use @sparticuz/chromium which bundles
  // a serverless-compatible Chromium binary (~50MB).
  // In dev, use the locally installed Chrome/Chromium.

  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    try {
      const chromium = (await import('@sparticuz/chromium')).default
      const puppeteer = (await import('puppeteer-core')).default

      const execPath = await chromium.executablePath()

      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: execPath,
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
      })
      return browser
    } catch (err) {
      console.error('Failed to launch Chromium (production):', err)
      throw new Error('PDF generation is not available. Missing @sparticuz/chromium.')
    }
  } else {
    // Development — try puppeteer (bundled Chromium) first, then puppeteer-core
    try {
      const puppeteer = (await import('puppeteer')).default
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      })
      return browser
    } catch {
      // Fallback: puppeteer-core with system Chrome
      try {
        const puppeteer = (await import('puppeteer-core')).default
        const browser = await puppeteer.launch({
          headless: true,
          executablePath:
            process.platform === 'darwin'
              ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
              : process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : '/usr/bin/google-chrome-stable',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        return browser
      } catch (err) {
        console.error('Failed to launch Chrome (dev):', err)
        throw new Error(
          'PDF generation requires Chrome. Install puppeteer: npm install puppeteer'
        )
      }
    }
  }
}

export async function POST(req: NextRequest) {
  let browser = null

  try {
    const { html } = await req.json()

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid HTML content' },
        { status: 400 }
      )
    }

    browser = await getBrowser()
    const page = await browser.newPage()

    // Set content and wait for everything to render
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // Give charts/SVGs a moment to finalize layout
    await new Promise(r => setTimeout(r, 500))

    // Generate PDF with Chrome's native print engine
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,  // ← CRITICAL: preserves background colors
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      preferCSSPageSize: false,
    })

    await page.close()

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.byteLength),
      },
    })
  } catch (err: unknown) {
    console.error('PDF generation error:', err)
    const message = err instanceof Error ? err.message : 'PDF generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // Browser already closed
      }
    }
  }
}































