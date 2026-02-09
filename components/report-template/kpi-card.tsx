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
        return '↑'
      case 'down':
        return '↓'
      default:
        return '→'
    }
  }

  // Generate a lighter version of the accent color for background
  const bgColor = `${accentColor}10`

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: '8px',
        padding: '16px',
        border: `1px solid ${accentColor}20`,
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}
      >
        {metric.label}
      </div>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: accentColor,
          marginBottom: metric.change ? '8px' : 0,
        }}
      >
        {formatValue(metric.value, metric.format)}
      </div>
      {metric.change && (
        <div
          style={{
            fontSize: '0.75rem',
            color: getStatusColor(metric.status),
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{getChangeIcon(metric.change.direction)}</span>
          <span>
            {metric.change.value.toFixed(1)}% {metric.change.comparison}
          </span>
        </div>
      )}
    </div>
  )
}

