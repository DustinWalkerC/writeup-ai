'use client'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <svg
        style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          width: 16, height: 16, color: '#A3A3A3',
        }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          paddingLeft: 40, paddingRight: value ? 40 : 14,
          paddingTop: 11, paddingBottom: 11,
          fontSize: 14, color: '#1A1A1A',
          fontFamily: 'var(--font-body, sans-serif)',
          background: '#FFFFFF',
          border: '1px solid #E8E5E0',
          borderRadius: 10,
          outline: 'none',
          transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#00B7DB'
          e.currentTarget.style.boxShadow = '0 0 0 3px #00B7DB15'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E8E5E0'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center',
            color: '#A3A3A3',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
