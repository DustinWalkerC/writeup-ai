import { ReportTemplateData } from '@/lib/report-template-types'
import { KPICard } from './kpi-card'
import { ProgressBar } from './progress-bar'
import { DataTable } from './data-table'

type Props = {
  data: ReportTemplateData
  showDataVisualization?: boolean
}

export function ReportTemplate({ data, showDataVisualization = true }: Props) {
  const hasKPIs = data.kpis && Object.values(data.kpis).some(Boolean)
  const hasProgress = data.progress && Object.values(data.progress).some(Boolean)
  const hasFinancials = data.financialSummary?.revenue?.length || data.financialSummary?.expenses?.length

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
      {/* Report Header */}
      <header style={{ marginBottom: '40px', borderBottom: '3px solid #0f172a', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#0f172a',
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
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
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
              color: '#64748b',
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
            {data.kpis.occupancy && <KPICard metric={data.kpis.occupancy} />}
            {data.kpis.collections && <KPICard metric={data.kpis.collections} />}
            {data.kpis.avgRent && <KPICard metric={data.kpis.avgRent} />}
            {data.kpis.noi && <KPICard metric={data.kpis.noi} />}
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
              {data.kpis.leaseVelocity && <KPICard metric={data.kpis.leaseVelocity} />}
              {data.kpis.renewalRate && <KPICard metric={data.kpis.renewalRate} />}
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
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '20px',
            }}
          >
            Progress Toward Targets
          </h3>
          {data.progress?.occupancyTarget && <ProgressBar metric={data.progress.occupancyTarget} />}
          {data.progress?.budgetYTD && <ProgressBar metric={data.progress.budgetYTD} />}
          {data.progress?.capexCompletion && <ProgressBar metric={data.progress.capexCompletion} />}
          {data.progress?.leaseUpProgress && <ProgressBar metric={data.progress.leaseUpProgress} />}
        </section>
      )}

      {/* Narrative Sections */}
      <section>
        {data.sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => (
            <div key={section.id} style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#0f172a',
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

      {/* Financial Summary Table */}
      {showDataVisualization && hasFinancials && (
        <section
          style={{
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <h3
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '20px',
            }}
          >
            Financial Summary
          </h3>
          {data.financialSummary?.revenue && data.financialSummary.revenue.length > 0 && (
            <DataTable title="Revenue" rows={data.financialSummary.revenue} />
          )}
          {data.financialSummary?.expenses && data.financialSummary.expenses.length > 0 && (
            <DataTable title="Expenses" rows={data.financialSummary.expenses} />
          )}
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        <p>
          Generated by writeup-ai | Template v{data.templateVersion} |{' '}
          {new Date(data.generatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </footer>
    </div>
  )
}
