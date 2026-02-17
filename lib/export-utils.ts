/**
 * Export utilities for PDF, HTML, and email clipboard operations.
 *
 * PDF STRATEGY (Puppeteer):
 * Instead of html2canvas → jsPDF (which misrenders flex, clips offscreen
 * elements, and ignores page-break CSS), we now:
 *   1. Build a complete HTML document with @media print styles
 *   2. POST it to /api/export-pdf
 *   3. Headless Chrome renders it with its native print engine
 *   4. Download the returned PDF blob
 *
 * Chrome's print engine correctly handles:
 *   - page-break-inside: avoid (charts, tables, KPI cards)
 *   - page-break-after: avoid (section headers)
 *   - Background colors (printBackground: true)
 *   - Flexbox, grid, SVG charts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── PDF Export ──────────────────────────────────────────────────

/**
 * Build a complete, self-contained HTML document for Puppeteer to render.
 * Includes @page margins and @media print rules for clean page breaks.
 */
export function buildPrintHTML(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Base reset */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Page margins — Puppeteer also sets these, but belt-and-suspenders */
    @page {
      size: letter;
      margin: 0.5in;
    }

    /* ═══ PRINT PAGE BREAK RULES ═══
       Chrome's print engine respects these perfectly. */

    /* Section headers: never orphan at bottom of page */
    h2 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* KPI metric tables: keep entire row on one page */
    table[data-metrics] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Chart containers: never split a chart across pages */
    [data-chart] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Data tables (revenue components, expense summary): keep together */
    table {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* SVG charts: keep together */
    svg {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Each section wrapper: prefer not to break inside, but allow if too tall */
    [data-section] {
      page-break-inside: auto;
      break-inside: auto;
    }

    /* Section title + first content block: keep together */
    [data-section] > h2 + * {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }

    /* Images: constrain and keep together */
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid !important;
    }
  </style>
</head>
<body>
  <div style="max-width: 100%; margin: 0 auto;">
    ${bodyContent}
  </div>
</body>
</html>`
}

/**
 * Generate PDF via the Puppeteer API route.
 * Falls back to window.print() if the API is unavailable.
 */
export async function generatePDF(element: HTMLElement, filename: string): Promise<void> {
  const bodyContent = element.innerHTML

  // Build complete HTML document with print styles
  const fullHTML = buildPrintHTML(bodyContent)

  try {
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: fullHTML }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `PDF generation failed (${response.status})`)
    }

    // Download the PDF blob
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Puppeteer PDF failed, falling back to window.print():', err)

    // Fallback: open in new window and trigger print dialog
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(fullHTML)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    } else {
      throw new Error('PDF generation failed and popup was blocked. Please allow popups and try again.')
    }
  }
}

// ── HTML Export ──────────────────────────────────────────────────

/**
 * Generate a standalone HTML document from report content
 */
export function generateStandaloneHTML(
  content: string,
  title: string,
  _companyName?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { padding: 0; }
      h2 { page-break-after: avoid; }
      table, [data-chart], [data-metrics], svg { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`
}

/**
 * Download HTML as a file
 */
export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Email HTML ──────────────────────────────────────────────────

/**
 * Build email-safe HTML from the report element.
 *
 * Light-touch approach: only constrains widths and makes images responsive.
 * Targeted fix: shrink min-width on header KPI cards so they wrap 2-3 per
 * row in narrow email compose windows instead of stacking 1 per row.
 */
export function buildEmailSafeHTML(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement

  // Make all images responsive
  clone.querySelectorAll('img').forEach(img => {
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
  })

  // Constrain chart/table widths
  clone.querySelectorAll('[data-chart]').forEach(el => {
    (el as HTMLElement).style.maxWidth = '100%'
    ;(el as HTMLElement).style.overflowX = 'auto'
  })

  // Targeted fix: find the header KPI row and reduce min-width
  const headerChart = clone.querySelector('[data-chart="header"]')
  if (headerChart) {
    const allDivs = Array.from(headerChart.querySelectorAll('div'))
    for (const div of allDivs) {
      const style = div.getAttribute('style') || ''
      if ((style.includes('display:flex') || style.includes('display: flex')) && style.includes('gap')) {
        const children = Array.from(div.children) as HTMLElement[]
        if (children.length >= 3) {
          children.forEach(child => {
            const childStyle = child.getAttribute('style') || ''
            const updated = childStyle.replace(/min-width:\s*\d+px/gi, 'min-width:100px')
            child.setAttribute('style', updated)
          })
          if (!style.includes('flex-wrap')) {
            div.setAttribute('style', `${style}; flex-wrap:wrap;`)
          }
          break
        }
      }
    }
  }

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto;">
${clone.innerHTML}
</div>`
}

// ── Clipboard Operations ────────────────────────────────────────

/**
 * Copy rich email-safe HTML to clipboard
 */
export async function copyRichHTMLToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const emailHTML = buildEmailSafeHTML(element)
    const htmlBlob = new Blob([emailHTML], { type: 'text/html' })
    const textBlob = new Blob([element.innerText], { type: 'text/plain' })

    const clipboardItem = new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    })

    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (err) {
    console.error('Failed to copy rich HTML:', err)
    try {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(element)
      selection?.removeAllRanges()
      selection?.addRange(range)
      document.execCommand('copy')
      selection?.removeAllRanges()
      return true
    } catch (fallbackErr) {
      console.error('Fallback copy failed:', fallbackErr)
      return false
    }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  return copyToClipboard(text)
}

// ── Filename Generation ─────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a clean filename from report details (LEGACY fallback)
 */
export function generateFilename(propertyName: string, month: string, year: number, extension: 'pdf' | 'html'): string {
  const cleanName = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const cleanMonth = month.toLowerCase().substring(0, 3)
  return `${cleanName}-report-${cleanMonth}-${year}.${extension}`
}

/**
 * Generate a filename from the user's export name template.
 */
export function generateFilenameFromTemplate(
  template: string | null | undefined,
  propertyName: string,
  month: number,
  year: number,
  companyName: string,
  format: string = 'pdf'
): string {
  const dateStr = `${String(month).padStart(2, '0')}/${year}`

  if (!template) {
    return `${propertyName} - Investor Report - ${String(month).padStart(2, '0')}-${year}.${format}`
  }

  const filename = template
    .replace(/\{property_name\}/gi, propertyName)
    .replace(/\{date\}/gi, dateStr.replace('/', '-'))
    .replace(/\{company_name\}/gi, companyName || 'Report')

  const sanitized = filename.replace(/[<>:"/\\|?*]/g, '').trim()
  return `${sanitized}.${format}`
}































