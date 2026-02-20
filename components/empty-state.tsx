'use client'

import Link from 'next/link'

type Props = {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  actionHref,
  onAction 
}: Props) {
  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 22px',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    background: '#00B7DB',
    border: 'none',
    borderRadius: 10,
    textDecoration: 'none' as const,
    boxShadow: '0 2px 12px #00B7DB30',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
  }

  const plusIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E8E5E0', borderRadius: 14,
      padding: 48, textAlign: 'center',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 64, height: 64, borderRadius: 16,
        background: '#F7F5F1', border: '1px solid #F0EDE8',
        color: '#7A7A7A', marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display, Georgia, serif)',
        fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 8,
      }}>{title}</h3>
      <p style={{
        fontSize: 14, color: '#7A7A7A', marginBottom: 24,
        maxWidth: 360, marginLeft: 'auto', marginRight: 'auto',
      }}>{description}</p>
      
      {actionLabel && actionHref && (
        <Link href={actionHref} style={buttonStyle}>
          {plusIcon}
          {actionLabel}
        </Link>
      )}
      
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} style={buttonStyle}>
          {plusIcon}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
