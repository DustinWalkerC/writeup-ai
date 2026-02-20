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
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E5E0',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 600, color: '#7A7A7A',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8, minHeight: 16, lineHeight: '16px',
          }}>{title}</p>
          <p style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: large ? 36 : 28,
            fontWeight: 500,
            color: accentColor || '#1A1A1A',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>{value}</p>
          {subtitle && (
            <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 6 }}>{subtitle}</p>
          )}
        </div>
        {icon && (
          <div style={{
            padding: 10, borderRadius: 10,
            background: accentColor ? `${accentColor}10` : '#F7F5F1',
            border: `1px solid ${accentColor ? `${accentColor}18` : '#F0EDE8'}`,
            color: accentColor || '#7A7A7A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
