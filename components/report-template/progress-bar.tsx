import { ProgressMetric } from '@/lib/report-template-types'

type Props = {
  metric: ProgressMetric
  accentColor?: string
}

export function ProgressBar({ metric, accentColor = '#0f172a' }: Props) {
  const percentage = Math.min(100, Math.max(0, (metric.current / metric.target) * 100))

  const getStatusColor = () => {
    if (percentage >= 100) return '#10b981'
    if (percentage >= 80) return accentColor
    if (percentage >= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            color: '#374151',
          }}
        >
          {metric.label}
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          {metric.current.toLocaleString()} / {metric.target.toLocaleString()}{'unit' in metric && metric.unit ? ` ${metric.unit}` : ''}
        </span>
      </div>
      <div
        style={{
          backgroundColor: '#e2e8f0',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: getStatusColor(),
            height: '100%',
            width: `${percentage}%`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          color: getStatusColor(),
          marginTop: '4px',
          textAlign: 'right',
        }}
      >
        {percentage.toFixed(0)}%
      </div>
    </div>
  )
}
