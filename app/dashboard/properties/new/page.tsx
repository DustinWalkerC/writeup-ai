'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProperty } from '@/app/actions/properties'

const C = {
  accent: '#00B7DB',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000',
}

const cardStyle: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', fontSize: 14, color: C.text,
  fontFamily: 'var(--font-body, sans-serif)',
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  outline: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
}
const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)',
  fontSize: 18, fontWeight: 500, color: C.text,
}

function useFocusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = C.accent
      e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accent}15`
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = C.border
      e.currentTarget.style.boxShadow = 'none'
    },
  }
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCsvHelp, setShowCsvHelp] = useState(false)
  const [budgetFile, setBudgetFile] = useState<File | null>(null)
  const [uploadingBudget, setUploadingBudget] = useState(false)
  const focus = useFocusHandlers()

  const [formData, setFormData] = useState({
    name: '', address: '', units: '', type: 'multifamily', investment_strategy: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('address', formData.address)
      data.append('units', formData.units)
      data.append('type', formData.type)
      data.append('investment_strategy', formData.investment_strategy)

      const result = await createProperty(data)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      if (budgetFile && result?.id) {
        setUploadingBudget(true)
        try {
          const budgetForm = new FormData()
          budgetForm.append('file', budgetFile)
          await fetch(`/api/properties/${result.id}/budget`, { method: 'POST', body: budgetForm })
        } catch (err) { console.error('Budget upload failed:', err) }
        setUploadingBudget(false)
      }

      router.push('/dashboard/properties')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/properties"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 600, color: C.textSoft, textDecoration: 'none',
            marginBottom: 16, transition: 'color 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Properties
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 26, fontWeight: 500, color: C.text, letterSpacing: '-0.015em',
        }}>Add New Property</h1>
        <p style={{ fontSize: 14, color: C.textSoft, marginTop: 4 }}>Add a property to your portfolio</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && (
          <div style={{
            padding: 14, background: '#CC000008', border: '1px solid #CC000020',
            borderRadius: 10, fontSize: 13, color: C.red,
          }}>{error}</div>
        )}

        {/* Property Details */}
        <div style={cardStyle}>
          <h3 style={{ ...sectionHeading, marginBottom: 20 }}>Property Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Property Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sunset Apartments" required style={inputStyle} {...focus} />
            </div>
            <div>
              <label style={labelStyle}>Address *</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main St, Houston, TX 77001" required style={inputStyle} {...focus} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Number of Units *</label>
                <input type="number" value={formData.units} onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                  placeholder="e.g., 150" min="1" required style={inputStyle} {...focus} />
              </div>
              <div>
                <label style={labelStyle}>Property Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                  {...focus}>
                  <option value="multifamily">Multifamily</option>
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="industrial">Industrial</option>
                  <option value="mixed_use">Mixed Use</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Context */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={sectionHeading}>Investment Context</h3>
            <span style={{
              fontSize: 10, fontWeight: 600, color: C.textMuted, background: C.bgAlt,
              border: `1px solid ${C.borderL}`, borderRadius: 100, padding: '3px 10px',
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
            }}>Optional</span>
          </div>
          <p style={{ fontSize: 13, color: C.textSoft, marginBottom: 20 }}>
            This information is used automatically in every report generated for this property.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Investment Strategy / Business Plan</label>
              <textarea value={formData.investment_strategy}
                onChange={(e) => setFormData({ ...formData, investment_strategy: e.target.value })}
                placeholder="e.g., Value-add acquisition targeting 20-unit interior renovation in Q1-Q2 2025..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' as const }} {...focus} />
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                The analysis engine weaves this context into the strategic recommendations of every report.
              </p>
            </div>

            {/* Budget Upload */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={labelStyle}>Annual Budget</label>
                <button type="button" onClick={() => setShowCsvHelp(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.accent }}>
                  How to export as CSV?
                </button>
              </div>

              {budgetFile ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  background: '#008A3E08', border: '1px solid #008A3E20', borderRadius: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: '#008A3E15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style={{ fontSize: 13, color: C.green, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{budgetFile.name}</span>
                  <button type="button" onClick={() => setBudgetFile(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.red }}>
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 16px', border: `2px dashed ${C.border}`, borderRadius: 10,
                  cursor: 'pointer', transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${C.accent}60`; e.currentTarget.style.background = `${C.accent}04` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.bgAlt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>Upload budget (.csv)</p>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Stored once, reused for all future reports</p>
                  <input type="file" style={{ display: 'none' }} accept=".csv"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setBudgetFile(f); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={isSubmitting || uploadingBudget}
            style={{
              flex: 1, padding: '13px 20px', fontSize: 14, fontWeight: 600,
              color: '#fff', background: C.accent, border: 'none', borderRadius: 10,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              boxShadow: `0 2px 12px ${C.accent}30`,
              transition: 'all 0.25s',
            }}>
            {isSubmitting ? (uploadingBudget ? 'Uploading Budget...' : 'Creating...') : 'Create Property'}
          </button>
          <Link href="/dashboard/properties"
            style={{
              padding: '13px 24px', fontSize: 14, fontWeight: 600, color: C.textMid,
              background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 10,
              textDecoration: 'none', transition: 'all 0.2s',
            }}>
            Cancel
          </Link>
        </div>
      </form>

      {/* CSV Help Modal */}
      {showCsvHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: C.bg, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', maxWidth: 440, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ ...sectionHeading }}>How to Export as CSV</h3>
              <button onClick={() => setShowCsvHelp(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: C.textMid }}>
              <div>
                <p style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>From Microsoft Excel:</p>
                <div style={{ background: C.bgAlt, borderRadius: 10, padding: 12, fontSize: 12, color: C.textSoft, lineHeight: 1.8 }}>
                  1. Open your budget file in Excel<br/>
                  2. Click <strong style={{ color: C.text }}>File</strong> then <strong style={{ color: C.text }}>Save As</strong><br/>
                  3. Choose your save location<br/>
                  4. Select <strong style={{ color: C.text }}>CSV (Comma delimited) (*.csv)</strong><br/>
                  5. Click <strong style={{ color: C.text }}>Save</strong>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>From Google Sheets:</p>
                <div style={{ background: C.bgAlt, borderRadius: 10, padding: 12, fontSize: 12, color: C.textSoft, lineHeight: 1.8 }}>
                  1. Open your budget in Google Sheets<br/>
                  2. Click <strong style={{ color: C.text }}>File</strong> then <strong style={{ color: C.text }}>Download</strong><br/>
                  3. Select <strong style={{ color: C.text }}>Comma-separated values (.csv)</strong>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted }}>
                CSV files are smaller and faster for our analysis engine to process than Excel files.
              </p>
            </div>
            <button onClick={() => setShowCsvHelp(false)}
              style={{
                width: '100%', marginTop: 20, padding: '11px 16px', fontSize: 14, fontWeight: 600,
                color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer',
              }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
