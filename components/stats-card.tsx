import { ReactNode } from 'react'

type StatsCardProps = {
  title: string
  value: number | string
  subtitle?: string
  accentColor?: string
  icon?: ReactNode
  large?: boolean
}

export function StatsCard({ title, value, subtitle, accentColor, icon, large }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`font-bold text-slate-900 mt-1 ${large ? 'text-4xl' : 'text-2xl'}`}
            style={accentColor ? { color: accentColor } : undefined}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: accentColor ? `${accentColor}15` : '#f1f5f9' }}
          >
            <div style={{ color: accentColor || '#64748b' }}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

