import { ReportTemplateData } from '@/lib/report-template-types'
import { KPICard } from './kpi-card'
import { ProgressBar } from './progress-bar'

type Props = {
  data: ReportTemplateData
  showDataVisualization?: boolean
  userSettings?: {
    company_name: string | null
    company_logo_url: string | null
    accent_color: string
    custom_disclaimer: string | null
  } | null
}

export function ReportTemplate({ data, showDataVisualization = true, userSettings }: Props) {
  const hasKPIs = data.kpis && Object.values(data.kpis).some(Boolean)
  const hasProgress = data.progress && Object.values(data.progress).some(Boolean)

  // Branding values
  const accentColor = userSettings?.accent_color || '#0f172a'
  const companyName = userSettings?.company_name || data.companyName || 'Your Firm Name'
  const logoUrl = userSettings?.company_logo_url
  const customDisclaimer = userSettings?.custom_disclaimer

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#1e293b',
        backgroundColor: '#ffffff',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px',
        lineHeight: 1.6,
      }}
    >
      {/* Report Header with Branding */}
      <header 
        style={{ 
          marginBottom: '40px', 
          borderBottom: `3px solid ${accentColor}`, 
          paddingBottom: '24px' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* Logo or Company Name */}
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={companyName} 
                style={{ 
                  height: '40px', 
                  objectFit: 'contain',
                  marginBottom: '12px'
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: accentColor,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {companyName}
              </div>
            )}
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: accentColor,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Monthly Investor Report
            </h1>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 500,
                color: '#475569',
                margin: '8px 0 0 0',
              }}
            >
              {data.propertyName}
            </h2>
            {data.propertyAddress && (
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0 0 0' }}>
                {data.propertyAddress}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: accentColor }}>
              {data.reportPeriod}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Report Date: {data.reportDate}
            </div>
          </div>
        </div>
      </header>

      {/* KPI Dashboard */}
      {showDataVisualization && hasKPIs && (
        <section style={{ marginBottom: '40px' }}>
          <h3
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '16px',
            }}
          >
            Key Performance Indicators
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            {data.kpis.occupancy && <KPICard metric={data.kpis.occupancy} accentColor={accentColor} />}
            {data.kpis.collections && <KPICard metric={data.kpis.collections} accentColor={accentColor} />}
            {data.kpis.avgRent && <KPICard metric={data.kpis.avgRent} accentColor={accentColor} />}
            {data.kpis.noi && <KPICard metric={data.kpis.noi} accentColor={accentColor} />}
          </div>
          {(data.kpis.leaseVelocity || data.kpis.renewalRate) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              {data.kpis.leaseVelocity && <KPICard metric={data.kpis.leaseVelocity} accentColor={accentColor} />}
              {data.kpis.renewalRate && <KPICard metric={data.kpis.renewalRate} accentColor={accentColor} />}
            </div>
          )}
        </section>
      )}

      {/* Progress Indicators */}
      {showDataVisualization && hasProgress && (
        <section
          style={{
            marginBottom: '40px',
            backgroundColor: '#f8fafc',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <h3
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '20px',
            }}
          >
            Progress Toward Targets
          </h3>
          {data.progress?.occupancyTarget && <ProgressBar metric={data.progress.occupancyTarget} accentColor={accentColor} />}
          {data.progress?.budgetYTD && <ProgressBar metric={data.progress.budgetYTD} accentColor={accentColor} />}
          {data.progress?.capexCompletion && <ProgressBar metric={data.progress.capexCompletion} accentColor={accentColor} />}
          {data.progress?.leaseUpProgress && <ProgressBar metric={data.progress.leaseUpProgress} accentColor={accentColor} />}
        </section>
      )}

      {/* Narrative Sections */}
      <section>
        {data.sections
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <div key={section.id} style={{ marginBottom: '32px' }} className="section">
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: accentColor,
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                {section.title}
              </h3>
              <div style={{ color: '#374151' }}>
                {section.content.split('\n').map((paragraph, pIndex) =>
                  paragraph.trim() ? (
                    <p key={pIndex} style={{ marginBottom: '12px' }}>
                      {paragraph}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          ))}
      </section>

      {/* Footer */}
      <footer
        className="footer"
        style={{
          marginTop: '48px',
          paddingTop: '24px',
          paddingBottom: '24px',
          borderTop: `2px solid ${accentColor}20`,
        }}
      >
        {/* Disclaimer */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '16px 20px',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {customDisclaimer || data.disclaimer ||
              'Confidential – For Investor Use Only. This report contains proprietary information and is intended solely for the use of the intended recipient(s). Any distribution or reproduction without prior written consent is strictly prohibited.'}
          </p>
        </div>

        {/* Company & Generation Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          <div>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={companyName} 
                style={{ height: '24px', objectFit: 'contain', opacity: 0.7 }}
              />
            ) : (
              <strong style={{ color: accentColor }}>{companyName}</strong>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            Template v{data.templateVersion} |{' '}
            {new Date(data.generatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </footer>
    </div>
  )
}


