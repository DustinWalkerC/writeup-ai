'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createReport } from '@/app/actions/reports'

type Property = { id: string; name: string; address: string; units: number }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const W = {
  accent: '#00B7DB',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000',
}

const cardStyle: React.CSSProperties = { background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, padding: 24 }

function onFocus(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${W.accent}15` }
function onBlur(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.boxShadow = 'none' }

export function NewReportForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPropertyId = searchParams.get('propertyId')

  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentDate = new Date()
  const [formData, setFormData] = useState({
    propertyId: preselectedPropertyId || '',
    month: MONTHS[currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1],
    year: currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear(),
  })

  useEffect(() => { fetchProperties() }, [])
  useEffect(() => {
    if (preselectedPropertyId && properties.length > 0) setFormData(prev => ({ ...prev, propertyId: preselectedPropertyId }))
  }, [preselectedPropertyId, properties])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties'); const result = await response.json()
      if (result.success) setProperties(result.data.properties)
    } catch (err) { console.error('Failed to fetch properties:', err) }
    finally { setIsLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.propertyId) { setError('Please select a property'); return }
    setIsSubmitting(true); setError(null)
    try {
      const result = await createReport(formData.propertyId, formData.month, formData.year)
      if (result?.id) router.push(`/dashboard/reports/${result.id}/edit`)
      else setError('Failed to create report')
    } catch (err) {
      console.error('Create report error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally { setIsSubmitting(false) }
  }

  const selectedProperty = properties.find(p => p.id === formData.propertyId)
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ width: 32, height: 32, border: `2.5px solid ${W.borderL}`, borderTop: `2.5px solid ${W.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/dashboard/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: W.textSoft, textDecoration: 'none', marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Reports
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 500, color: W.text, letterSpacing: '-0.015em' }}>Create New Report</h1>
        <p style={{ fontSize: 14, color: W.textSoft, marginTop: 4 }}>Generate an AI-powered investor report</p>
      </div>

      {properties.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' as const }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: W.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text, marginBottom: 8 }}>No properties yet</h3>
          <p style={{ fontSize: 14, color: W.textSoft, marginBottom: 24 }}>Add a property first before creating a report</p>
          <Link href="/dashboard/properties/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px',
            background: W.accent, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600,
            textDecoration: 'none', boxShadow: `0 2px 12px ${W.accent}30`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Property
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{ padding: 14, background: '#CC000008', border: '1px solid #CC000020', borderRadius: 10, fontSize: 13, color: W.red }}>{error}</div>
          )}

          {/* Property Selection */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text, marginBottom: 16 }}>Select Property</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {properties.map((property) => {
                const isSelected = formData.propertyId === property.id
                return (
                  <label key={property.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                    border: `2px solid ${isSelected ? W.accent : W.border}`,
                    background: isSelected ? `${W.accent}06` : W.bg,
                  }}>
                    <input type="radio" name="property" value={property.id} checked={isSelected}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} style={{ display: 'none' }} />
                    {/* Radio circle */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isSelected ? W.accent : W.border}`,
                      background: isSelected ? W.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#fff">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: W.text }}>{property.name}</div>
                      <div style={{ fontSize: 12, color: W.textSoft, marginTop: 2 }}>{property.address}</div>
                    </div>
                    <div style={{
                      padding: '4px 10px', background: W.bgAlt, border: `1px solid ${W.borderL}`,
                      borderRadius: 8, fontSize: 12, fontWeight: 600, color: W.textMid,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {property.units} units
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Report Period */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text, marginBottom: 16 }}>Report Period</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid, marginBottom: 6 }}>Month</label>
                <select value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 14, color: W.text,
                    background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10,
                    outline: 'none', transition: 'all 0.25s',
                    appearance: 'none' as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  }} onFocus={onFocus} onBlur={onBlur}>
                  {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid, marginBottom: 6 }}>Year</label>
                <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 14, color: W.text,
                    background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10,
                    outline: 'none', transition: 'all 0.25s',
                    appearance: 'none' as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  }} onFocus={onFocus} onBlur={onBlur}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>

            {selectedProperty && (
              <div style={{
                marginTop: 16, padding: 14, background: W.bgWarm,
                border: `1px solid ${W.borderL}`, borderRadius: 10,
              }}>
                <p style={{ fontSize: 13, color: W.textMid }}>
                  You&apos;re creating a <strong style={{ color: W.text }}>{formData.month} {formData.year}</strong> report for <strong style={{ color: W.text }}>{selectedProperty.name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={isSubmitting || !formData.propertyId}
              style={{
                flex: 1, padding: '13px 20px', fontSize: 14, fontWeight: 600,
                color: '#fff', background: W.accent, border: 'none', borderRadius: 10,
                cursor: isSubmitting || !formData.propertyId ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !formData.propertyId ? 0.5 : 1,
                boxShadow: `0 2px 12px ${W.accent}30`, transition: 'all 0.25s',
              }}>
              {isSubmitting ? 'Creating...' : 'Continue to Report Setup'}
            </button>
            <Link href="/dashboard/reports" style={{
              padding: '13px 24px', fontSize: 14, fontWeight: 600, color: W.textMid,
              background: 'transparent', border: `1.5px solid ${W.border}`, borderRadius: 10,
              textDecoration: 'none', display: 'flex', alignItems: 'center',
            }}>Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}
