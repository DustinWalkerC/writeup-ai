// ═══════════════════════════════════════════════════════════════
// lib/email-renderer.ts  v4
// Programmatic MJML builder — generates institutional-quality
// email HTML from generated_sections JSON.
//
// v4 fixes:
//  • Uses exec summary chart_html as the email header (correct
//    5-col KPI grid matching PDF, not the inferior MJML version)
//  • Removes duplicate MJML-generated header/KPI strip
//  • Wider container (660px) for better rendering
//  • Responsive meta tags for mobile
// ═══════════════════════════════════════════════════════════════

import mjml2html from 'mjml';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface KPIMetric {
  label: string;
  value: string;
  change?: string;
  changeDirection?: string;
  direction?: string;
  vsbudget?: string;
}

export interface GeneratedSection {
  id: string;
  title: string;
  content: string;
  chart_html?: string;
  metrics?: KPIMetric[];
  included: boolean;
  skipReason?: string | null;
}

export interface ReportData {
  property_name: string;
  unit_count: string | number;
  reporting_period: string;
  property_location: string;
  property_class?: string;
  company_name: string;
  company_logo_url?: string;
  disclaimer_text?: string;
  generated_date?: string;
  primary_color: string;
  accent_color: string;
  green_color?: string;
  red_color?: string;
}

export interface ChartImageMap {
  [sectionId: string]: string;
}

export interface EmailRenderOptions {
  report: ReportData;
  sections: GeneratedSection[];
  chartImages?: ChartImageMap;
}

export interface EmailRenderResult {
  html: string;
  errors: Array<{ message: string; tagName?: string; line?: number }>;
  estimatedSizeKB: number;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDirection(metric: KPIMetric): string {
  return metric.changeDirection || metric.direction || 'neutral';
}

function deltaColor(metric: KPIMetric, green: string, red: string): string {
  const dir = getDirection(metric);
  if (dir === 'up') return green;
  if (dir === 'down') return red;
  return '#999999';
}

/**
 * Convert plain narrative text to email-safe HTML paragraphs.
 */
function narrativeToHTML(text: string): string {
  if (!text) return '';

  let clean = text
    .replace(/<div\s+style=['"][^'"]*['"][\s\S]*?<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  clean = clean
    .replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');

  const paragraphs = clean
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs
    .map(p => `<p style="margin:0 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.7;color:#4A5568;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Build inline metrics summary for a section.
 */
function buildMetricsLine(metrics: KPIMetric[], primary: string, green: string, red: string): string {
  if (!metrics || metrics.length === 0) return '';

  const items = metrics.slice(0, 4).map(m => {
    const color = deltaColor(m, green, red);
    const changeStr = m.change
      ? ` <span style="color:${color};font-weight:600;">(${m.change})</span>`
      : '';
    return `<span style="font-weight:700;color:${primary};">${escapeXml(m.label)}:</span> ${escapeXml(m.value)}${changeStr}`;
  });

  return items.join(' &nbsp;&middot;&nbsp; ');
}

/**
 * Adapt the chart_html header block for email.
 * - Constrains max-width to fit the email container
 * - Ensures the 5-col KPI grid scales properly
 */
function adaptHeaderForEmail(chartHtml: string, containerWidth: number): string {
  if (!chartHtml) return '';

  let adapted = chartHtml;

  // Constrain the outer wrapper to email container width
  adapted = adapted.replace(
    /max-width:\s*816px/gi,
    `max-width:${containerWidth}px`
  );

  // Ensure the header bar doesn't use flexbox (some email clients don't support it)
  // But Gmail does, so we'll keep it and add table fallbacks via mso conditionals later

  // Scale down font sizes slightly for the narrower container
  // KPI values: 20px → 18px for better fit in 5 columns
  // This is optional — only if the 5-col looks cramped

  return adapted;
}

/**
 * Extract just the chart portion from exec summary chart_html,
 * separating the header/KPI block from any actual chart (like NOI T12).
 * Returns { headerHtml, chartOnlyHtml }
 */
function splitHeaderAndChart(chartHtml: string): { headerHtml: string; chartOnlyHtml: string } {
  if (!chartHtml) return { headerHtml: '', chartOnlyHtml: '' };

  // The chart_html typically contains:
  // 1. A wrapper div with max-width:816px
  //    └── Header bar (background:#002D5F)
  //    └── Accent stripe (height:3px)
  //    └── KPI grid (grid-template-columns:repeat(5,...))
  // 2. Sometimes followed by an actual chart div

  // We'll return the whole thing as headerHtml since the chart
  // (NOI T12 bar chart) is part of the exec summary visualization
  return { headerHtml: chartHtml, chartOnlyHtml: '' };
}

// ─────────────────────────────────────────────────────────────
// MJML BUILDER
// ─────────────────────────────────────────────────────────────

export async function renderEmailHTML(options: EmailRenderOptions): Promise<EmailRenderResult> {
  const { report, sections, chartImages = {} } = options;

  const primary = report.primary_color || '#002D5F';
  const accent = report.accent_color || '#CC0000';
  const green = report.green_color || '#008A3E';
  const red = report.red_color || '#CC0000';
  const genDate = report.generated_date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const containerWidth = 660;

  const includedSections = sections.filter(s => s.included);
  const execSummary = includedSections.find(s => s.id === 'executive_summary') || includedSections[0];
  const remaining = includedSections.filter(s => s.id !== execSummary?.id);

  // Get the exec summary chart_html — this IS our email header
  const execChartHtml = execSummary?.chart_html || '';
  const hasEmbeddedHeader = execChartHtml.toLowerCase().includes('grid-template-columns');

  // ── Build MJML string ──
  let mjml = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Georgia, 'Times New Roman', serif" />
      <mj-text font-size="14px" color="#333333" line-height="1.6" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
    <mj-style>
      @media only screen and (max-width: 480px) {
        .header-block div[style*="grid-template-columns"] {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .header-block div[style*="display:flex"] {
          flex-direction: column !important;
        }
        .header-block div[style*="font-size:22px"],
        .header-block div[style*="font-size:20px"] {
          font-size: 16px !important;
        }
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#F0EDE8" width="${containerWidth}px">`;

  // ════════════════════════════════════════════════════
  // HEADER — Use the chart_html header from exec summary
  // This is the correct one with company name + 5-col KPI grid
  // matching the PDF output exactly.
  // ════════════════════════════════════════════════════
  if (hasEmbeddedHeader) {
    // Embed the chart_html header directly — it has the nice
    // 5-column KPI grid, company name, property details
    const adaptedHeader = adaptHeaderForEmail(execChartHtml, containerWidth - 56);
    mjml += `
    <mj-section background-color="#FFFFFF" padding="0">
      <mj-column padding="0">
        <mj-text padding="0" css-class="header-block">
          ${adaptedHeader}
        </mj-text>
      </mj-column>
    </mj-section>`;
  } else {
    // Fallback: build a simple MJML header if no chart_html header exists
    mjml += `
    <mj-section background-color="${primary}" padding="24px 28px 20px 28px">
      <mj-column>
        <mj-text color="rgba(255,255,255,0.45)" font-size="10px" font-weight="600" letter-spacing="2px" text-transform="uppercase" padding="0" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
          ${escapeXml(report.company_name || 'Asset Performance Report')}
        </mj-text>
        <mj-text color="#FFFFFF" font-size="20px" font-weight="700" padding="4px 0 0 0">
          ${escapeXml(report.property_name)}${report.unit_count ? ` &middot; ${report.unit_count} Units` : ''}
        </mj-text>
        <mj-text color="rgba(255,255,255,0.4)" font-size="11px" padding="4px 0 0 0" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
          ${escapeXml(report.reporting_period)} &middot; ${escapeXml(report.property_location)}${report.property_class ? ` &middot; ${escapeXml(report.property_class)}` : ''}
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="${accent}" padding="0">
      <mj-column><mj-spacer height="3px" /></mj-column>
    </mj-section>`;
  }

  // ════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY — Narrative only (header already rendered above)
  // ════════════════════════════════════════════════════
  if (execSummary) {
    mjml += `
    <mj-section background-color="#FFFFFF" padding="28px 28px 0 28px">
      <mj-column>
        <mj-text padding="0 0 10px 0" font-size="15px" font-weight="700" text-transform="uppercase" letter-spacing="0.8px" color="${primary}" font-family="'Segoe UI', Helvetica, Arial, sans-serif" border-bottom="2px solid ${primary}">
          Executive Summary
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#FFFFFF" padding="16px 28px 20px 28px">
      <mj-column>
        <mj-text padding="0">
          ${narrativeToHTML(execSummary.content)}
        </mj-text>
      </mj-column>
    </mj-section>`;

    // If there's a chart IMAGE (from Puppeteer screenshots), show it
    // Otherwise the chart was already part of the header block above
    const execChartUrl = chartImages[execSummary.id];
    if (execChartUrl) {
      mjml += `
    <mj-section background-color="#FFFFFF" padding="0 28px 24px 28px">
      <mj-column>
        <mj-image src="${execChartUrl}" alt="Executive Summary Chart" width="${containerWidth - 56}px" padding="0" border="1px solid #E8E8E8" border-radius="4px" />
      </mj-column>
    </mj-section>`;
    }
  }

  // ════════════════════════════════════════════════════
  // REMAINING SECTIONS
  // ════════════════════════════════════════════════════
  for (const section of remaining) {
    // Divider
    mjml += `
    <mj-section background-color="#FFFFFF" padding="0 28px">
      <mj-column>
        <mj-divider border-color="#E5E5E5" border-width="1px" padding="0" />
      </mj-column>
    </mj-section>`;

    // Section header
    mjml += `
    <mj-section background-color="#FFFFFF" padding="20px 28px 0 28px">
      <mj-column>
        <mj-text padding="0 0 10px 0" font-size="15px" font-weight="700" text-transform="uppercase" letter-spacing="0.8px" color="${primary}" font-family="'Segoe UI', Helvetica, Arial, sans-serif" border-bottom="2px solid ${primary}">
          ${escapeXml(section.title)}
        </mj-text>
      </mj-column>
    </mj-section>`;

    // Section metrics mini-strip
    if (section.metrics && section.metrics.length > 0) {
      const metricsLine = buildMetricsLine(section.metrics, primary, green, red);
      mjml += `
    <mj-section background-color="#F9FAFB" padding="10px 28px" border-bottom="1px solid #E8E8E8">
      <mj-column>
        <mj-text padding="0" font-size="12px" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
          ${metricsLine}
        </mj-text>
      </mj-column>
    </mj-section>`;
    }

    // Section narrative
    mjml += `
    <mj-section background-color="#FFFFFF" padding="16px 28px 8px 28px">
      <mj-column>
        <mj-text padding="0">
          ${narrativeToHTML(section.content)}
        </mj-text>
      </mj-column>
    </mj-section>`;

    // Section chart
    const chartUrl = chartImages[section.id];
    const chartHtml = section.chart_html;

    if (chartUrl) {
      mjml += `
    <mj-section background-color="#FFFFFF" padding="8px 28px 24px 28px">
      <mj-column>
        <mj-image src="${chartUrl}" alt="${escapeXml(section.title)} Chart" width="${containerWidth - 56}px" padding="0" border="1px solid #E8E8E8" border-radius="4px" />
      </mj-column>
    </mj-section>`;
    } else if (chartHtml) {
      mjml += `
    <mj-section background-color="#FFFFFF" padding="8px 28px 24px 28px">
      <mj-column>
        <mj-text padding="0">
          <div style="width:100%;max-width:${containerWidth - 56}px;overflow:hidden;border:1px solid #E8E8E8;border-radius:4px;padding:12px;">
            ${chartHtml}
          </div>
        </mj-text>
      </mj-column>
    </mj-section>`;
    }
  }

  // ════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════
  mjml += `
    <mj-section background-color="#FFFFFF" padding="0 28px">
      <mj-column>
        <mj-divider border-color="#E5E5E5" border-width="1px" padding="0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="#FFFFFF" padding="20px 28px 12px 28px">
      <mj-column>
        <mj-text font-size="13px" font-weight="700" color="${primary}" padding="0" font-family="Georgia, 'Times New Roman', serif">
          ${escapeXml(report.company_name)}
        </mj-text>
        <mj-text font-size="11px" color="#999999" padding="4px 0 0 0" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
          Report generated by WriteUp AI &middot; ${escapeXml(genDate)}
        </mj-text>
      </mj-column>
    </mj-section>`;

  if (report.disclaimer_text) {
    mjml += `
    <mj-section background-color="#F9FAFB" padding="14px 28px" border-top="1px solid #E8E8E8">
      <mj-column>
        <mj-text font-size="10px" color="#999999" line-height="1.5" padding="0" font-family="'Segoe UI', Helvetica, Arial, sans-serif">
          ${escapeXml(report.disclaimer_text)}
        </mj-text>
      </mj-column>
    </mj-section>`;
  }

  mjml += `
    <mj-section background-color="#F0EDE8" padding="16px">
      <mj-column><mj-spacer height="1px" /></mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  // ── Compile MJML → HTML ──
  const { html, errors } = mjml2html(mjml, {
    validationLevel: 'soft',
    minify: true,
    keepComments: false,
  });

  // ── Sanitize ──
  const sanitized = sanitizeEmailHTML(html);
  const estimatedSizeKB = Math.round(Buffer.byteLength(sanitized, 'utf-8') / 1024);

  return { html: sanitized, errors: errors || [], estimatedSizeKB };
}

// ─────────────────────────────────────────────────────────────
// SANITIZATION
// ─────────────────────────────────────────────────────────────

function sanitizeEmailHTML(html: string): string {
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form)[^>]*\/?>/gi, '');
  return clean;
}

export { sanitizeEmailHTML };
