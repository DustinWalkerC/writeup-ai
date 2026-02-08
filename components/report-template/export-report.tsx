'use client'

import { useRef, useState } from 'react'
import { ReportTemplateData } from '@/lib/report-template-types'
import { 
  generatePDF, 
  generateStandaloneHTML, 
  downloadHTML, 
  copyToClipboard,
  generateFilename 
} from '@/lib/export-utils'

type Props = {
  data: ReportTemplateData
  propertyName: string
  month: string
  year: number
}

export function ExportReport({ data, propertyName, month, year }: Props) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    
    setIsExporting(true)
    setExportStatus('Generating PDF...')
    
    try {
      const filename = generateFilename(propertyName, month, year, 'pdf')
      await generatePDF(reportRef.current, filename)
      setExportStatus('PDF downloaded')
      setTimeout(() => setExportStatus(null), 2000)
    } catch (error) {
      console.error('PDF export error:', error)
      setExportStatus('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportHTML = () => {
    if (!reportRef.current) return
    
    setIsExporting(true)
    setExportStatus('Generating HTML...')
    
    try {
      const html = generateStandaloneHTML(
        reportRef.current.innerHTML,
        `${propertyName} - ${month} ${year} Report`,
        data.companyName
      )
      const filename = generateFilename(propertyName, month, year, 'html')
      downloadHTML(html, filename)
      setExportStatus('HTML downloaded')
      setTimeout(() => setExportStatus(null), 2000)
    } catch (error) {
      console.error('HTML export error:', error)
      setExportStatus('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyHTML = async () => {
    if (!reportRef.current) return
    
    setExportStatus('Copying...')
    
    const html = generateStandaloneHTML(
      reportRef.current.innerHTML,
      `${propertyName} - ${month} ${year} Report`,
      data.companyName
    )
    
    const success = await copyToClipboard(html)
    setExportStatus(success ? 'Copied to clipboard' : 'Copy failed')
    setTimeout(() => setExportStatus(null), 2000)
  }

  return (
    <div>
      {/* Export Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
        >
          {isExporting ? 'Exporting...' : 'Download PDF'}
        </button>
        <button
          onClick={handleExportHTML}
          disabled={isExporting}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
        >
          Download HTML
        </button>
        <button
          onClick={handleCopyHTML}
          disabled={isExporting}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
        >
          Copy HTML
        </button>
        {exportStatus && (
          <span className="text-sm text-slate-500">{exportStatus}</span>
        )}
      </div>

      {/* Report Content for Export */}
      <div 
        ref={reportRef}
        className="bg-white"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Header */}
        <div style={{ borderBottom: '3px solid #0f172a', paddingBottom: '20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
                Monthly Investor Report
              </div>
              <div style={{ fontSize: '1.25rem', color: '#475569', marginTop: '4px' }}>
                {data.propertyName}
              </div>
              {data.propertyAddress && (
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                  {data.propertyAddress}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                {data.reportPeriod}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                {data.reportDate}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {data.kpis && Object.values(data.kpis).some(Boolean) && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: '#64748b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              marginBottom: '16px' 
            }}>
              Key Performance Indicators
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '16px' 
            }}>
              {Object.entries(data.kpis).map(([key, kpi]) => {
                if (!kpi) return null
                return (
                  <div 
                    key={key}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                      {formatKPIValue(kpi.value, kpi.format)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      {kpi.label}
                    </div>
                    {kpi.change && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        marginTop: '4px',
                        color: kpi.change.direction === 'up' ? '#059669' : 
                               kpi.change.direction === 'down' ? '#dc2626' : '#64748b'
                      }}>
                        {kpi.change.direction === 'up' ? '↑' : kpi.change.direction === 'down' ? '↓' : '→'}
                        {' '}{formatChangeValue(kpi.change.value, kpi.format)} {kpi.change.comparison}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sections */}
        <div>
          {data.sections
            .filter(s => s.content)
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <div key={section.id} style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px',
                  marginBottom: '12px',
                }}>
                  {section.title}
                </div>
                <div style={{ color: '#334155' }}>
                  {section.content.split('\n').map((para, i) =>
                    para.trim() ? (
                      <p key={i} style={{ marginBottom: '12px' }}>{para}</p>
                    ) : null
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              {data.disclaimer || 'Confidential – For Investor Use Only. This report contains proprietary information and is intended solely for the use of the intended recipient(s).'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}>
            <div>
              <strong style={{ color: '#64748b' }}>{data.companyName || 'Your Firm Name'}</strong>
            </div>
            <div>
              Template v{data.templateVersion} | {data.reportDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatKPIValue(value: string | number, format: string): string {
  if (typeof value === 'string') return value
  switch (format) {
    case 'percent': return `${value.toFixed(1)}%`
    case 'currency': 
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
      return `$${value.toLocaleString()}`
    case 'number': return value.toLocaleString()
    default: return String(value)
  }
}

function formatChangeValue(value: number, format: string): string {
  if (format === 'currency') {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }
  return `${value.toFixed(1)}%`
}
