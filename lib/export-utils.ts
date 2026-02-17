/**
 * Export utilities for generating PDF, email-safe HTML, and clipboard operations
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #ffffff; padding: 40px; max-width: 800px; margin: 0 auto;">
${content}
</body>
</html>`
}

/**
 * PDF EXPORT WIDTH
 * Letter paper = 8.5" wide, 0.5" margins each side = 7.5" printable = ~750px.
 */
const PDF_CONTENT_WIDTH = 750

/**
 * Generate PDF from an HTML element.
 * Temporarily moves the off-screen export container into the viewport
 * so html2canvas can render it correctly.
 */
export async function generatePDF(element: HTMLElement, filename: string): Promise<void> {
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default as any

  // Move wrapper into viewport for html2canvas
  const wrapper = element.parentElement
  const savedWrapperStyle = wrapper?.getAttribute('style') || ''

  if (wrapper) {
    wrapper.style.cssText =
      `position:fixed;left:0;top:0;width:${PDF_CONTENT_WIDTH}px;z-index:-9999;pointer-events:none;background:#fff;`
  }

  // Force the inner element to match
  const savedElementWidth = element.style.width
  element.style.width = `${PDF_CONTENT_WIDTH}px`

  await new Promise(r => setTimeout(r, 200))

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      width: PDF_CONTENT_WIDTH,
      windowWidth: PDF_CONTENT_WIDTH,
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['[data-metrics]', '[data-chart]', 'table', 'tr', 'svg'],
    },
  }

  try {
    await html2pdf().set(opt).from(element).save()
  } finally {
    element.style.width = savedElementWidth
    if (wrapper) wrapper.style.cssText = savedWrapperStyle
  }
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

/**
 * Build email-safe HTML from the report element.
 *
 * Light-touch approach: only constrains widths and makes images responsive.
 * Does NOT convert flex layouts — the header and section KPIs render fine
 * in Gmail/Apple Mail/Outlook.com with inline flex styles.
 *
 * The only targeted fix: shrink min-width on the header KPI row children
 * so they wrap to 2-3 per row in narrow email compose windows instead of
 * stacking 1 per row.
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

  // Targeted fix: find the header KPI row (the first flex row inside
  // data-chart="header" that has 3+ children with min-width set).
  // Reduce min-width from ~140px to 100px so they wrap 2-3 per row
  // in narrow email compose windows (~550px) instead of 1 per row.
  const headerChart = clone.querySelector('[data-chart="header"]')
  if (headerChart) {
    const allDivs = Array.from(headerChart.querySelectorAll('div'))
    for (const div of allDivs) {
      const style = div.getAttribute('style') || ''
      if ((style.includes('display:flex') || style.includes('display: flex')) && style.includes('gap')) {
        const children = Array.from(div.children) as HTMLElement[]
        if (children.length >= 3) {
          // Shrink min-width on each KPI card so they can wrap
          children.forEach(child => {
            const childStyle = child.getAttribute('style') || ''
            const updated = childStyle.replace(/min-width:\s*\d+px/gi, 'min-width:100px')
            child.setAttribute('style', updated)
          })
          // Ensure the flex container wraps
          if (!style.includes('flex-wrap')) {
            div.setAttribute('style', `${style}; flex-wrap:wrap;`)
          }
          break // Only fix the first KPI row in the header
        }
      }
    }
  }

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto;">
${clone.innerHTML}
</div>`
}

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






























