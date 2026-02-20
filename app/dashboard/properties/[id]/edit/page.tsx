'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { updateProperty } from '@/app/actions/properties'

type Property = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  units: number | null
  investment_strategy?: string | null
  budget_file_name?: string | null
}

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
  width: '100%', padding: '11px 16px', fontSize: 14, color: C.text,
  fontFamily: 'var(--font-body, sans-serif)',
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  outline: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
}
const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)',
  fontSize: 18, fontWeight: 500, color: C.text,
}

function focusHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = C.accent
  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accent}15`
}
function blurHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = C.border
  e.currentTarget.style.boxShadow = 'none'
}

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCsvHelp, setShowCsvHelp] = useState(false)
  const [investmentStrategy, setInvestmentStrategy] = useState('')
  const [budgetFileName, setBudgetFileName] = useState('')
  const [uploadingBudget, setUploadingBudget] = useState(false)
  const [hasReports, setHasReports] = useState(false)

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setProperty(data)
        setInvestmentStrategy(data.investment_strategy || '')
        setBudgetFileName(data.budget_file_name || '')
        setHasReports(data.has_reports || false)
      } catch (err: any) {
        setError(err.message || 'Failed to load property')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProperty()
  }, [propertyId])

  const handleBudgetUpload = async (file: File) => {
    if (!property) return
    setUploadingBudget(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/properties/${property.id}/budget`, { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) setBudgetFileName(data.budgetFileName)
      else alert(data.error || 'Budget upload failed')
    } catch (err) {
      console.error('Budget upload failed:', err)
      alert('Budget upload failed')
    } finally {
      setUploadingBudget(false)
    }
  }

  const handleBudgetDelete = async () => {
    if (!property) return
    try {
      await fetch(`/api/properties/${property.id}/budget`, { method: 'DELETE' })
      setBudgetFileName('')
    } catch (err) {
      console.error('Budget delete failed:', err)
      alert('Failed to remove budget')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('investment_strategy', investmentStrategy)
      await updateProperty(propertyId, formData)
      router.push('/dashboard/properties')
    } catch (err: any) {
      setError(err.message || 'Failed to update property')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{
          width: 32, height: 32, border: `2.5px solid ${C.borderL}`,
          borderTop: `2.5px solid ${C.accent}`, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!property) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: 14, color: C.red }}>{error || 'Property not found'}</p>
        <button onClick={() => router.push('/dashboard/properties')}
          style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.accent }}>
          Back to Properties
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/dashboard/properties')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 26, fontWeight: 500, color: C.text, letterSpacing: '-0.015em',
          }}>Edit Property</h1>
          <p style={{ fontSize: 14, color: C.textSoft, marginTop: 2 }}>{property.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && (
          <div style={{ padding: 12, background: '#CC000008', border: '1px solid #CC000020', borderRadius: 10, fontSize: 13, color: C.red }}>{error}</div>
        )}

        {/* Property Details */}
        <div style={cardStyle}>
          <h3 style={{ ...sectionHeading, marginBottom: 20 }}>Property Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Property Name
                {hasReports && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    Locked — reports exist
                  </span>
                )}
              </label>
              <input name="name" type="text" defaultValue={property.name} required readOnly={hasReports}
                style={{
                  ...inputStyle,
                  ...(hasReports ? { background: C.bgAlt, color: C.textSoft, cursor: 'not-allowed' } : {}),
                }} onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input name="address" type="text" defaultValue={property.address || ''} style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input name="city" type="text" defaultValue={property.city || ''} style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input name="state" type="text" defaultValue={property.state || ''} style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Number of Units</label>
              <input name="units" type="number" defaultValue={property.units || ''} min="1" style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
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
              <textarea value={investmentStrategy} onChange={e => setInvestmentStrategy(e.target.value)}
                placeholder="e.g., Value-add acquisition targeting 20-unit interior renovation..."
                rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} onFocus={focusHandler as any} onBlur={blurHandler as any} />
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

              {budgetFileName ? (
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
                  <span style={{ fontSize: 13, color: C.green, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{budgetFileName}</span>
                  <button type="button" onClick={handleBudgetDelete}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.red }}>Remove</button>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.accent, cursor: 'pointer' }}>
                    Replace
                    <input type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.xls"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBudgetUpload(f); if (e.target) e.target.value = '' }} />
                  </label>
                </div>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 16px', border: `2px dashed ${uploadingBudget ? C.borderL : C.border}`,
                  borderRadius: 10, cursor: uploadingBudget ? 'default' : 'pointer',
                  background: uploadingBudget ? C.bgAlt : 'transparent', transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => { if (!uploadingBudget) { e.currentTarget.style.borderColor = `${C.accent}60`; e.currentTarget.style.background = `${C.accent}04` }}}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = uploadingBudget ? C.borderL : C.border; e.currentTarget.style.background = uploadingBudget ? C.bgAlt : 'transparent' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.bgAlt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>{uploadingBudget ? 'Uploading...' : 'Upload budget (.csv or .xlsx)'}</p>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Stored once, reused for all future reports</p>
                  <input type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.xls" disabled={uploadingBudget}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBudgetUpload(f); if (e.target) e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={isSaving}
            style={{
              flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600,
              color: '#fff', background: C.accent, border: 'none', borderRadius: 10,
              cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1,
              boxShadow: `0 2px 12px ${C.accent}30`,
            }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/properties')}
            style={{
              padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.textMid,
              background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: 'pointer',
            }}>
            Cancel
          </button>
        </div>
      </form>

      {/* CSV Help Modal */}
      {showCsvHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: C.bg, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', maxWidth: 440, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: C.text }}>How to Export as CSV</h3>
              <button onClick={() => setShowCsvHelp(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: C.textMid }}>
              <div>
                <p style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>From Microsoft Excel:</p>
                <div style={{ background: C.bgAlt, borderRadius: 10, padding: 12, fontSize: 12, color: C.textSoft, lineHeight: 1.8 }}>
                  1. Open your budget file in Excel<br/>2. Click <strong style={{ color: C.text }}>File</strong> → <strong style={{ color: C.text }}>Save As</strong><br/>
                  3. Select <strong style={{ color: C.text }}>CSV (Comma delimited) (*.csv)</strong><br/>4. Click <strong style={{ color: C.text }}>Save</strong>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>From Google Sheets:</p>
                <div style={{ background: C.bgAlt, borderRadius: 10, padding: 12, fontSize: 12, color: C.textSoft, lineHeight: 1.8 }}>
                  1. Click <strong style={{ color: C.text }}>File</strong> → <strong style={{ color: C.text }}>Download</strong><br/>
                  2. Select <strong style={{ color: C.text }}>Comma-separated values (.csv)</strong>
                </div>
              </div>
            </div>
            <button onClick={() => setShowCsvHelp(false)}
              style={{ width: '100%', marginTop: 20, padding: '11px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
