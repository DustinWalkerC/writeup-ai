'use client'

import Link from 'next/link'

type Property = {
  id: string
  name: string
  address: string
  units: number
  lastReport?: {
    month: string
    year: number
    status: string
  } | null
}

type Props = {
  property: Property
}

const statusStyles: Record<string, { color: string; bg: string; border: string }> = {
  complete:   { color: '#008A3E', bg: '#008A3E12', border: '#008A3E25' },
  generating: { color: '#1D98B1', bg: '#00B7DB0D', border: '#00B7DB22' },
  draft:      { color: '#B8960F', bg: '#C8B88A18', border: '#C8B88A30' },
  error:      { color: '#CC0000', bg: '#CC000010', border: '#CC000020' },
}

export function PropertyCard({ property }: Props) {
  const status = property.lastReport?.status
    ? statusStyles[property.lastReport.status] || statusStyles.draft
    : null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E5E0',
        borderRadius: 14,
        padding: 20,
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 16, fontWeight: 500, color: '#1A1A1A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{property.name}</h3>
          <p style={{
            fontSize: 12, color: '#7A7A7A', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{property.address}</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginLeft: 12,
          padding: '5px 10px', background: '#F7F5F1', border: '1px solid #F0EDE8',
          borderRadius: 8, flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A', fontVariantNumeric: 'tabular-nums' }}>{property.units}</span>
        </div>
      </div>

      {/* Last Report */}
      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #F0EDE8' }}>
        {property.lastReport ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>Last report</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>
                {property.lastReport.month} {property.lastReport.year}
              </span>
              {status && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                  color: status.color, background: status.bg,
                  border: `1px solid ${status.border}`,
                  borderRadius: 100, padding: '3px 10px',
                }}>
                  {property.lastReport.status}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>Last report</span>
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>No reports yet</span>
          </div>
        )}
      </div>

      {/* Actions — 2-color system */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {/* Generate = ACCENT */}
        <Link
          href={`/dashboard/reports/new?propertyId=${property.id}`}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            color: '#FFFFFF', background: '#00B7DB',
            border: 'none', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 2px 10px #00B7DB25',
            transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Report
        </Link>
        {/* Edit = SECONDARY */}
        <Link
          href={`/dashboard/properties/${property.id}/edit`}
          style={{
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            color: '#4A4A4A', background: 'transparent',
            border: '1.5px solid #E8E5E0', borderRadius: 10,
            textDecoration: 'none',
            transition: 'all 0.25s',
          }}
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
