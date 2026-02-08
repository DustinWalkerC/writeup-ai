
import { KPIMetric, formatCurrency, formatPercent, formatChange } from '@/lib/report-template-types'

type Props = {
  metric: KPIMetric
}

export function KPICard({ metric }: Props) {
  const formatValue = (value: string | number, format: KPIMetric['format']) => {
    if (typeof value === 'string') return value
    switch (format) {
      case 'percent': return formatPercent(value)
      case 'currency': return formatCurrency(value, true)
      case 'number': return value.toLocaleString()
      default: return String(value)
    }
  }

  const statusColors = {
    good: { bg: '#ecfdf5', border: '#10b981', text: '#059669' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' },
    critical: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
    neutral: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' },
  }

  const status = metric.status || 'neutral'
  const colors = statusColors[status]

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#0f172a',
          lineHeight: 1.2,
        }}
      >
        {formatValue(metric.value, metric.format)}
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginTop: '4px',
          fontWeight: 500,
        }}
      >
        {metric.label}
      </div>
      {metric.change && (
        <div
          style={{
            fontSize: '0.8rem',
            marginTop: '8px',
            color: metric.change.direction === 'up' ? '#059669' : 
                   metric.change.direction === 'down' ? '#dc2626' : '#64748b',
            fontWeight: 500,
          }}
        >
          {metric.change.direction === 'up' ? '↑' : 
           metric.change.direction === 'down' ? '↓' : '→'}{' '}
          {formatChange(Math.abs(metric.change.value), metric.format === 'currency' ? 'currency' : 'percent')}{' '}
          {metric.change.comparison}
        </div>
      )}
    </div>
  )
}
