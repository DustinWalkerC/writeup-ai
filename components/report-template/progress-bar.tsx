import { ProgressMetric } from '@/lib/report-template-types'

type Props = {
  metric: ProgressMetric
}

export function ProgressBar({ metric }: Props) {
  const percentage = Math.min(100, Math.max(0, (metric.current / metric.target) * 100))

  const statusColors = {
    'on-track': '#10b981',
    'at-risk': '#f59e0b',
    behind: '#ef4444',
  }

  const status =
    metric.status || (percentage >= 90 ? 'on-track' : percentage >= 70 ? 'at-risk' : 'behind')
  const fillColor = statusColors[status]

  const formatValue = (value: number) => {
    switch (metric.format) {
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'currency':
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
        return `$${value.toLocaleString()}`
      default:
        return value.toLocaleString()
    }
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
          {metric.label}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {formatValue(metric.current)} / {formatValue(metric.target)}
        </span>
      </div>
      <div
        style={{
          height: '10px',
          backgroundColor: '#e5e7eb',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: fillColor,
            borderRadius: '5px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
        {percentage.toFixed(0)}% of target
      </div>
    </div>
  )
}
