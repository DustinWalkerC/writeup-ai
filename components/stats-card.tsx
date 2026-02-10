'use client'

type Props = {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  accentColor?: string
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend,
  accentColor = '#06b6d4'
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p 
            className="text-3xl font-bold mt-1"
            style={{ color: accentColor }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-500'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% from last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div style={{ color: accentColor }}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  )
}

