'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { C } from '@/lib/report-pipeline-tokens'

/* ── Types ── */
type Property = {
  id: string
  name: string
  address: string
  units: number
  hasBudget: boolean
  hasContext: boolean
  lastReport: string | null
  hasGenerated: boolean
}

type PropertiesData = {
  properties: Property[]
  stats: { totalProperties: number; totalUnits: number }
}

type SlotInfo = { used: number; total: number }

/* ═══════════════════════════════════════════════════════════════
   MOBILE CSS
   ═══════════════════════════════════════════════════════════════ */
const PROPS_MOBILE_CSS = `
@media (max-width: 768px) {
  .props-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
  }
  .props-header-actions {
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    gap: 8px !important;
  }
  .props-search-box {
    flex: 1 !important;
    width: auto !important;
    min-width: 0 !important;
  }
  .props-add-btn {
    white-space: nowrap !important;
    padding: 10px 14px !important;
    flex-shrink: 0 !important;
    font-size: 14px !important;
  }
  .props-add-btn .props-label-full { display: none !important; }
  .props-add-btn .props-label-short { display: inline !important; }
  .props-stats-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .props-card-grid {
    grid-template-columns: 1fr !important;
  }
  .props-card-actions {
    flex-direction: row !important;
  }
  .props-last-report {
    flex-wrap: wrap !important;
    gap: 4px !important;
  }
  .props-page-title {
    font-size: 22px !important;
  }
  .props-subtitle {
    font-size: 13px !important;
  }
}
`;

/* ── Icons ── */
const I = {
  building: (c = C.textSoft, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" /></svg>,
  plus: (c = '#fff', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  users: (c = C.textSoft, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
  search: (c = C.textMuted, s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  chart: (c = C.accent, s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  check: (c = C.green, s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  minus: (c = C.textMuted, s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  clock: (c = C.textMuted, s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
}

/* ── Setup Chip ── */
function SetupChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 500,
      color: done ? C.green : C.textMuted,
      padding: '4px 8px', borderRadius: 6,
      background: done ? `${C.green}08` : C.bgAlt,
      border: `1px solid ${done ? `${C.green}18` : C.borderL}`,
    }}>
      {done ? I.check(C.green, 11) : I.minus(C.textMuted, 11)}
      {label}
    </span>
  )
}

/* ═══ MAIN ═══ */
export function PropertiesContent() {
  const [data, setData] = useState<PropertiesData | null>(null)
  const [slots, setSlots] = useState<SlotInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [propRes, subRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/subscription'),
      ])
      const propResult = await propRes.json()
      const subResult = await subRes.json()

      if (propResult.success) setData(propResult.data)
      else setError(propResult.error || 'Failed to load')

      if (subResult.success) {
        const sub = subResult.data.subscription
        const usage = subResult.data.usage
        setSlots({ used: usage.properties_used || 0, total: sub?.property_slots || 2 })
      }
    } catch { setError('Failed to load properties') }
    finally { setIsLoading(false) }
  }

  const filteredProperties = useMemo(() => {
    if (!data?.properties) return []
    if (!searchQuery) return data.properties
    const q = searchQuery.toLowerCase()
    return data.properties.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
  }, [data?.properties, searchQuery])

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p style={{ color: '#CC0000', fontSize: 14 }}>{error}</p>
      <button onClick={fetchData} style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
    </div>
  )

  const hasProperties = data?.properties && data.properties.length > 0
  const allSlotsFull = slots ? (data?.properties?.length || 0) >= slots.total : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
      <style>{PROPS_MOBILE_CSS}</style>

      {/* Header with search + button */}
      <div className="props-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="props-page-title" style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.text, letterSpacing: '-0.015em', margin: 0 }}>Properties</h1>
          <p className="props-subtitle" style={{ fontSize: 15, color: C.textSoft, marginTop: 4 }}>
            Manage your portfolio properties
            {slots && <span style={{ color: C.textMuted }}> · {slots.used} of {slots.total} slots used</span>}
          </p>
        </div>
        <div className="props-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {hasProperties && (
            <div className="props-search-box" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, boxSizing: 'border-box' as const }}>
              {I.search(C.textMuted, 15)}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: C.text, fontFamily: 'inherit', width: '100%', minWidth: 0 }}
              />
            </div>
          )}
          <Link className="props-add-btn" href="/dashboard/properties/new" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600,
            color: '#fff', background: C.accent, border: 'none', borderRadius: 10, cursor: 'pointer',
            boxShadow: `0 2px 12px ${C.accent}30`, whiteSpace: 'nowrap', textDecoration: 'none',
          }}>
            {I.plus('#fff', 16)}
            <span className="props-label-full">Add Property</span>
            <span className="props-label-short" style={{ display: 'none' }}>Add</span>
          </Link>
        </div>
      </div>

      {hasProperties ? (
        <>
          {/* Stats */}
          <div className="props-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft }}>TOTAL PROPERTIES</div>
                <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.text, lineHeight: 1, marginTop: 4 }}>{data?.stats.totalProperties || 0}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{I.building(C.textSoft)}</div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft }}>TOTAL UNITS</div>
                <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 28, fontWeight: 500, color: C.accent, lineHeight: 1, marginTop: 4 }}>{data?.stats.totalUnits.toLocaleString() || 0}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{I.users(C.textSoft)}</div>
            </div>
          </div>

          {/* Cards Grid — 3 col desktop, 1 col mobile */}
          <div className="props-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filteredProperties.map((p) => {
              const isHovered = hovered === p.id
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
                    overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                    transform: isHovered ? 'translateY(-2px)' : 'none',
                    boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.06)' : 'none',
                    minWidth: 0,
                  }}
                >
                  <div style={{ padding: '18px 20px 14px' }}>
                    {/* Name + units */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                      <h3 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 17, fontWeight: 500, color: C.text, margin: 0, lineHeight: 1.3, minWidth: 0, wordBreak: 'break-word' as const }}>{p.name}</h3>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textSoft, background: C.bgAlt, borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {I.building(C.textSoft, 12)} {p.units}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 14 }}>{p.address || 'No address'}</div>

                    {/* Setup chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <SetupChip done={p.hasBudget} label="Budget" />
                      <SetupChip done={p.hasContext} label="Inv. context" />
                    </div>

                    {/* Last report + generated tag */}
                    <div className="props-last-report" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMuted, minWidth: 0, overflow: 'hidden' }}>
                        {I.clock(C.textMuted, 13)}
                        <span style={{ whiteSpace: 'nowrap' }}>Last report:</span>
                        <span style={{ fontWeight: 500, color: p.lastReport ? C.textMid : C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.lastReport || 'None'}
                        </span>
                      </div>
                      {p.hasGenerated && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: C.green, background: `${C.green}08`, border: `1px solid ${C.green}18`,
                          borderRadius: 100, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          Generated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="props-card-actions" style={{ display: 'flex', gap: 8, padding: '0 20px 18px' }}>
                    <Link href={`/dashboard/reports/new?property=${p.id}`} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff',
                      background: C.accentAction, border: 'none', borderRadius: 10, cursor: 'pointer',
                      boxShadow: `0 2px 10px ${C.accentAction}25`, textDecoration: 'none',
                    }}>
                      {I.plus('#fff', 14)} New Report
                    </Link>
                    <Link href={`/dashboard/properties/${p.id}/edit`} style={{
                      padding: '10px 16px', fontSize: 14, fontWeight: 500, color: C.textMid,
                      background: C.bgAlt, border: `1px solid ${C.borderL}`, borderRadius: 10, cursor: 'pointer',
                      textDecoration: 'none', display: 'flex', alignItems: 'center',
                    }}>
                      Edit
                    </Link>
                  </div>
                </div>
              )
            })}

            {/* Upgrade / empty slot card */}
            {!searchQuery && allSlotsFull && (
              <Link href="/dashboard/pricing" style={{
                background: 'transparent', border: `2px dashed ${C.border}`, borderRadius: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 32, textAlign: 'center', textDecoration: 'none',
                transition: 'all 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.accent}50`; e.currentTarget.style.background = `${C.accent}06` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  {I.chart(C.accent, 22)}
                </div>
                <div style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 4 }}>Need More Properties?</div>
                <div style={{ fontSize: 14, color: C.textSoft }}>Upgrade your plan to add more slots</div>
              </Link>
            )}

            {/* Empty slot placeholders */}
            {!searchQuery && !allSlotsFull && slots && Array.from({ length: Math.min(Math.max(0, slots.total - (data?.properties?.length || 0)), 3) }).map((_, i) => (
              <Link key={`slot-${i}`} href="/dashboard/properties/new" style={{
                background: C.bgWarm, border: `2px dashed ${C.border}`, borderRadius: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 180, gap: 12, padding: 24, textDecoration: 'none',
                transition: 'all 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.accent}50`; e.currentTarget.style.background = `${C.accent}06` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgWarm }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.bgAlt, border: `1px solid ${C.borderL}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {I.plus(C.textMuted, 22)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textSoft }}>Set Up Property</span>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Slot {(data?.properties?.length || 0) + i + 1} of {slots.total}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* No search results */}
          {searchQuery && filteredProperties.length === 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
              <p style={{ color: C.textSoft, fontSize: 14 }}>No properties match your search</p>
              <button onClick={() => setSearchQuery('')} style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Clear search</button>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {I.building(C.textSoft, 28)}
          </div>
          <h3 style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 8 }}>No properties yet</h3>
          <p style={{ fontSize: 14, color: C.textSoft, marginBottom: 24 }}>Add your first property to start generating investor reports</p>
          <Link href="/dashboard/properties/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600,
            color: '#fff', background: C.accent, border: 'none', borderRadius: 10,
            boxShadow: `0 2px 12px ${C.accent}30`, textDecoration: 'none',
          }}>
            {I.plus('#fff', 16)} Add Property
          </Link>
        </div>
      )}
    </div>
  )
}
