'use client'

type Props = {
  data: number[]
  color?: string
  height?: number
  type?: 'line' | 'bar'
}

export function KPIChart({ 
  data, 
  color = '#06b6d4', 
  height = 40,
  type = 'line' 
}: Props) {
  if (data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const normalize = (value: number) => ((value - min) / range) * height

  if (type === 'bar') {
    const barWidth = 100 / data.length
    return (
      <svg width="100%" height={height} className="overflow-visible">
        {data.map((value, i) => {
          const barHeight = normalize(value)
          return (
            <rect
              key={i}
              x={`${i * barWidth + barWidth * 0.1}%`}
              y={height - barHeight}
              width={`${barWidth * 0.8}%`}
              height={barHeight}
              fill={color}
              opacity={0.7 + (i / data.length) * 0.3}
              rx={2}
            />
          )
        })}
      </svg>
    )
  }

  // Line chart
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - normalize(value)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} 100,${height}`

  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx="100%"
        cy={height - normalize(data[data.length - 1])}
        r="3"
        fill={color}
      />
    </svg>
  )
}
