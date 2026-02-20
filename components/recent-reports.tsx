'use client'

import Link from 'next/link'

type Report = {
  id: string
  status: string
  month: string
  year: number
  updatedAt: string
  propertyName: string
}

type Props = {
  reports: Report[]
}

const statusStyles: Record<string, { color: string; bg: string; border: string; label: string }> = {
  complete:   { color: '#008A3E', bg: '#008A3E12', border: '#008A3E25', label: 'complete' },
  generating: { color: '#1D98B1', bg: '#00B7DB0D', border: '#00B7DB22', label: 'generating' },
  draft:      { color: '#B8960F', bg: '#C8B88A18', border: '#C8B88A30', label: 'draft' },
  error:      { color: '#CC0000', bg: '#CC000010', border: '#CC000020', label: 'error' },
}

export function RecentReports({ reports }: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (reports.length === 0) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14, padding: 24 }}>
        <h3 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 16,
        }}>Recent Reports</h3>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: '#7A7A7A' }}>No reports yet</p>
          <Link
            href="/dashboard/reports/new"
            style={{
              display: 'inline-block', marginTop: 12,
              fontSize: 14, fontWeight: 600, color: '#00B7DB',
              textDecoration: 'none',
            }}
          >
            Create your first report →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 18, fontWeight: 500, color: '#1A1A1A',
        }}>Recent Reports</h3>
        <Link
          href="/dashboard/reports"
          style={{
            fontSize: 13, fontWeight: 600, color: '#00B7DB',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00B7DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reports.map((report) => {
          const st = statusStyles[report.status] || statusStyles.draft
          return (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid #F0EDE8',
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FAF9F7'
                e.currentTarget.style.borderColor = '#E8E5E0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#F0EDE8'
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{report.propertyName}</p>
                <p style={{ fontSize: 12, color: '#7A7A7A', marginTop: 2 }}>
                  {report.month} {report.year}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#A3A3A3', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDate(report.updatedAt)}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                  color: st.color, background: st.bg,
                  border: `1px solid ${st.border}`,
                  borderRadius: 100, padding: '4px 11px',
                }}>
                  {st.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
