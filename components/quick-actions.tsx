'use client'

import Link from 'next/link'

type Property = {
  id: string
  name: string
}

type Props = {
  propertiesNeedingReports: Property[]
  currentPeriod: { month: string; year: number }
}

export function QuickActions({ propertiesNeedingReports, currentPeriod }: Props) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14, padding: 24 }}>
      <h3 style={{
        fontFamily: 'var(--font-display, Georgia, serif)',
        fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 16,
      }}>Quick Actions</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Primary Action = ACCENT */}
        <Link
          href="/dashboard/reports/new"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 10,
            background: '#00B7DB', color: '#FFFFFF',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
            boxShadow: '0 2px 12px #00B7DB30',
            transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create New Report
        </Link>

        {/* Secondary Action */}
        <Link
          href="/dashboard/properties/new"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 10,
            background: 'transparent', color: '#4A4A4A',
            border: '1.5px solid #E8E5E0',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
            transition: 'all 0.25s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00B7DB50'
            e.currentTarget.style.background = '#00B7DB06'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E8E5E0'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>
          </svg>
          Add Property
        </Link>

        {/* Properties needing reports */}
        {propertiesNeedingReports.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid #F0EDE8' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: '#7A7A7A',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              Needs {currentPeriod.month} report:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {propertiesNeedingReports.map((property) => (
                <Link
                  key={property.id}
                  href={`/dashboard/reports/new?propertyId=${property.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 10,
                    background: '#C8B88A12', border: '1px solid #C8B88A30',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C8B88A20'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#C8B88A12'
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{property.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#00B7DB' }}>Create →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
