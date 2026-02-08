/**
 * Export utilities for generating PDF and HTML from reports
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Generate a standalone HTML document from report content
 */
export function generateStandaloneHTML(
  content: string,
  title: string,
  _companyName?: string // Optional third param for compatibility
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
 * Generate PDF from an HTML element
 */
export async function generatePDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Dynamic import for client-side only
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default as any

  const opt = {
    margin: [0.75, 0.5, 0.75, 0.5],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['css', 'legacy'],
    },
  }

  await html2pdf().set(opt).from(element).save()
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
 * Copy rich HTML to clipboard (renders in email clients like Gmail)
 */
export async function copyRichHTMLToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const htmlContent = element.innerHTML
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
    const textBlob = new Blob([element.innerText], { type: 'text/plain' })

    const clipboardItem = new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    })

    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (err) {
    console.error('Failed to copy rich HTML:', err)

    // Fallback: select and copy
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

/**
 * Copy text to clipboard (aliased for compatibility)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }
}

/**
 * Copy plain text to clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  return copyToClipboard(text)
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a clean filename from report details
 */
export function generateFilename(
  propertyName: string,
  month: string,
  year: number,
  extension: 'pdf' | 'html'
): string {
  const cleanName = propertyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const cleanMonth = month.toLowerCase().substring(0, 3)

  return `${cleanName}-report-${cleanMonth}-${year}.${extension}`
}



