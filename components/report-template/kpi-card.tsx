import { KPIMetric } from '@/lib/report-template-types'

type Props = {
  metric: KPIMetric
  accentColor?: string
}

export function KPICard({ metric, accentColor = '#0f172a' }: Props) {
  const formatValue = (value: number | string, format: KPIMetric['format']) => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'currency':
        return value >= 1000000
          ? `$${(value / 1000000).toFixed(1)}M`
          : value >= 1000
          ? `$${(value / 1000).toFixed(0)}K`
          : `$${value.toLocaleString()}`
      case 'number':
        return value.toLocaleString()
      default:
        return String(value)
    }
  }

  const getStatusColor = (status: KPIMetric['status']) => {
    switch (status) {
      case 'good':
        return '#10b981'
      case 'warning':
        return '#f59e0b'
      case 'critical':
        return '#ef4444'
      default:
        return '#64748b'
    }
  }

  const getChangeIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return '▲'
      case 'down':
        return '▼'
      default:
        return '→'
    }
  }

  const bgColor = `${accentColor}10`

  return (
    <>
      <div
        className="kpi-card"
        style={{
          backgroundColor: bgColor,
          borderRadius: 8,
          padding: '14px 12px',
          border: `1px solid ${accentColor}20`,
          minWidth: 0, // prevents flex children from overflowing
        }}
      >
        <div
          className="kpi-label"
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 6,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {metric.label}
        </div>
        <div
          className="kpi-value"
          style={{
            fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
            fontWeight: 700,
            color: accentColor,
            marginBottom: metric.change ? 6 : 0,
            lineHeight: 1.2,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {formatValue(metric.value, metric.format)}
        </div>
        {metric.change && (
          <div
            className="kpi-change"
            style={{
              fontSize: '0.7rem',
              color: getStatusColor(metric.status),
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              flexWrap: 'wrap',
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: '0.6rem' }}>{getChangeIcon(metric.change.direction)}</span>
            <span>
              {metric.change.value.toFixed(1)}% {metric.change.comparison}
            </span>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .kpi-card {
            padding: 10px 8px !important;
          }
          .kpi-label {
            font-size: 0.6rem !important;
            margin-bottom: 4px !important;
          }
          .kpi-value {
            font-size: 1rem !important;
          }
          .kpi-change {
            font-size: 0.6rem !important;
          }
        }
      `}</style>
    </>
  )
}
