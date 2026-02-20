'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { LogoUploader } from '@/components/logo-uploader'
import { TemplatePreview } from '@/components/template-preview'
import { COLOR_PRESETS, type ColorPresetKey } from '@/lib/branding'
import { ALL_SECTIONS, TIER_SECTIONS, type SectionId } from '@/lib/section-definitions'
import { SECTION_CHART_MAP } from '@/lib/generation-config'
import { CHART_LABELS, ALL_QUESTIONS, SECTION_INFO } from '@/lib/question-section-map'

type UserSettings = {
  id?: string; user_id?: string; company_name: string | null; company_logo_url: string | null
  accent_color: string; secondary_color?: string; report_accent_color?: string
  ai_tone: string; custom_disclaimer: string | null; report_template?: SectionId[] | null
  export_name_template?: string | null; created_at?: string; updated_at?: string
}

type Props = { initialSettings: UserSettings | null; tier: string }

const W = {
  accent: '#00B7DB', accentD: '#1D98B1',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000', gold: '#C8B88A',
}

const cardStyle: React.CSSProperties = { background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, padding: 24 }
const h2Style: React.CSSProperties = { fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid, marginBottom: 4 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 16px', fontSize: 14, color: W.text,
  fontFamily: 'var(--font-body, sans-serif)',
  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10,
  outline: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
}

function onFocus(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${W.accent}15` }
function onBlur(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.boxShadow = 'none' }

// ─── Helpers ───
function getAllAvailableSections(tier: string): SectionId[] {
  const tiers: string[] = ['foundational']
  if (tier === 'professional' || tier === 'institutional') tiers.push('professional')
  if (tier === 'institutional') tiers.push('institutional')
  const seen = new Set<SectionId>(); const result: SectionId[] = []
  for (const t of tiers) { for (const id of TIER_SECTIONS[t] || []) { if (!seen.has(id)) { seen.add(id); result.push(id) } } }
  return result
}
function getSectionTier(sectionId: SectionId): string {
  if (TIER_SECTIONS.foundational.includes(sectionId)) return 'foundational'
  if (TIER_SECTIONS.professional.includes(sectionId)) return 'professional'
  return 'institutional'
}
function getAllSectionIds(): SectionId[] {
  const seen = new Set<SectionId>(); const result: SectionId[] = []
  for (const t of ['foundational', 'professional', 'institutional']) { for (const id of TIER_SECTIONS[t] || []) { if (!seen.has(id)) { seen.add(id); result.push(id) } } }
  return result
}
const TIER_LABELS: Record<string, string> = { foundational: 'Foundational', professional: 'Professional', institutional: 'Institutional' }

// ─── Info Panel ───
function SectionInfoPanel({ sectionId }: { sectionId: string }) {
  const info = SECTION_INFO[sectionId]; if (!info) return null
  return (
    <div style={{ marginTop: 4, marginLeft: 52, marginRight: 8, padding: 12, background: `${W.accent}06`, border: `1px solid ${W.accent}15`, borderRadius: 10, fontSize: 12 }}>
      <p style={{ color: W.textMid, lineHeight: 1.5 }}>{info.summary}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: 10, color: W.textSoft }}>
        <span><strong style={{ color: W.textMid }}>Data source:</strong> {info.dataSource}</span>
        <span><strong style={{ color: W.textMid }}>Your input:</strong> {info.guidedInput}</span>
      </div>
    </div>
  )
}

function LightbulbButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        flexShrink: 0, padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
        color: isOpen ? '#D97706' : '#FBB040', background: isOpen ? '#FEF3C720' : 'transparent',
        transition: 'all 0.2s',
      }} title="Section details">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    </button>
  )
}

// ═══ Main Component ═══
export function SettingsForm({ initialSettings, tier }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [activeTier, setActiveTier] = useState(tier)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const stored = localStorage.getItem('writeup_tier_override')
      if (stored && stored !== 'none') setActiveTier(stored)
    }
    const handler = (e: CustomEvent) => setActiveTier(e.detail === 'none' ? tier : e.detail)
    window.addEventListener('tierOverrideChanged', handler as EventListener)
    return () => window.removeEventListener('tierOverrideChanged', handler as EventListener)
  }, [tier])

  const [companyName, setCompanyName] = useState(initialSettings?.company_name || '')
  const [accentColor, setAccentColor] = useState(initialSettings?.accent_color || '#27272A')
  const [secondaryColor, setSecondaryColor] = useState(initialSettings?.secondary_color || '#EFF6FF')
  const [reportAccentColor, setReportAccentColor] = useState(initialSettings?.report_accent_color || '#2563EB')
  const [aiTone, setAiTone] = useState<'conservative' | 'balanced' | 'optimistic'>((initialSettings?.ai_tone as any) || 'balanced')
  const [customDisclaimer, setCustomDisclaimer] = useState(initialSettings?.custom_disclaimer || '')

  const availableSections = useMemo(() => getAllAvailableSections(activeTier), [activeTier])
  const allSections = useMemo(() => getAllSectionIds(), [])

  const [enabledSections, setEnabledSections] = useState<SectionId[]>(() => {
    if (initialSettings?.report_template && Array.isArray(initialSettings.report_template)) {
      const available = new Set(getAllAvailableSections(tier))
      return (initialSettings.report_template as SectionId[]).filter(id => available.has(id))
    }
    return TIER_SECTIONS[tier] || TIER_SECTIONS.foundational
  })

  useEffect(() => {
    const available = new Set(getAllAvailableSections(activeTier))
    if (initialSettings?.report_template && Array.isArray(initialSettings.report_template)) {
      const filtered = (initialSettings.report_template as SectionId[]).filter(id => available.has(id))
      if (filtered.length > 0) { setEnabledSections(filtered); return }
    }
    setEnabledSections(TIER_SECTIONS[activeTier] || TIER_SECTIONS.foundational)
  }, [activeTier, initialSettings?.report_template])

  const [exportNameTemplate, setExportNameTemplate] = useState(initialSettings?.export_name_template || '{property_name}, as of {date}, Investor Report')
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set())
  const toggleInfo = useCallback((sectionId: string) => {
    setExpandedInfo(prev => { const n = new Set(prev); if (n.has(sectionId)) n.delete(sectionId); else n.add(sectionId); return n })
  }, [])
  const [previewMode, setPreviewMode] = useState<'outline' | 'preview'>('outline')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteRef = useRef<HTMLDivElement>(null)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setPaletteOpen(false) }
    document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activePresetName = (() => {
    for (const key of Object.keys(COLOR_PRESETS) as ColorPresetKey[]) {
      const p = COLOR_PRESETS[key]
      if (accentColor === p.primary && secondaryColor === p.secondary && reportAccentColor === p.accent) return p.name
    }
    return null
  })()

  const handleToggleSection = useCallback((sectionId: SectionId) => {
    if (sectionId === 'executive_summary') return
    setEnabledSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId])
  }, [])

  const handleDragStart = useCallback((idx: number) => setDraggedIdx(idx), [])
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }, [])
  const handleDrop = useCallback((targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) { setDraggedIdx(null); setDragOverIdx(null); return }
    setEnabledSections(prev => { const n = [...prev]; const [m] = n.splice(draggedIdx, 1); n.splice(targetIdx, 0, m); return n })
    setDraggedIdx(null); setDragOverIdx(null)
  }, [draggedIdx])
  const handleDragEnd = useCallback(() => { setDraggedIdx(null); setDragOverIdx(null) }, [])

  const relevantQuestionCount = useMemo(() => {
    const s = new Set(enabledSections)
    return ALL_QUESTIONS.filter(q => q.relatedSections.some(r => s.has(r))).length
  }, [enabledSections])

  const exportNamePreview = useMemo(() => {
    return exportNameTemplate.replace('{property_name}', 'Sunset Apartments').replace('{date}', '01/2026').replace('{company_name}', companyName || 'Your Company') + '.pdf'
  }, [exportNameTemplate, companyName])

  const lockedSections = useMemo(() => {
    const available = new Set(availableSections); return allSections.filter(id => !available.has(id))
  }, [availableSections, allSections])

  const nextTierUp = activeTier === 'foundational' ? 'professional' : activeTier === 'professional' ? 'institutional' : null

  const handleSave = async () => {
    setIsSaving(true); setSaveStatus('idle')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, accent_color: accentColor, secondary_color: secondaryColor, report_accent_color: reportAccentColor, ai_tone: aiTone, custom_disclaimer: customDisclaimer, report_template: enabledSections, export_name_template: exportNameTemplate }),
      })
      const result = await response.json()
      setSaveStatus(result.success ? 'saved' : 'error')
      if (result.success && result.data) setSettings(result.data)
    } catch (error) { console.error('Save error:', error); setSaveStatus('error') }
    finally { setIsSaving(false); setTimeout(() => setSaveStatus('idle'), 3000) }
  }

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.success) { const sr = await fetch('/api/settings'); const sd = await sr.json(); if (sd.success) setSettings(sd.data) }
    } catch (e) { console.error('Upload error:', e) }
  }
  const handleLogoRemove = async () => {
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_logo_url: null }) })
      const r = await res.json(); if (r.success) setSettings(prev => prev ? { ...prev, company_logo_url: null } : null)
    } catch (e) { console.error('Remove logo error:', e) }
  }
  const handlePresetClick = (key: ColorPresetKey) => {
    const p = COLOR_PRESETS[key]; setAccentColor(p.primary); setSecondaryColor(p.secondary); setReportAccentColor(p.accent); setPaletteOpen(false)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 500, color: W.text, letterSpacing: '-0.015em', marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: W.textSoft, marginBottom: 32 }}>Customize your reports and branding</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Company Info */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 16 }}>Company Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Capital Partners" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <LogoUploader currentLogoUrl={settings?.company_logo_url || null} onUpload={handleLogoUpload} onRemove={handleLogoRemove} />
            </div>
          </section>

          {/* Report Branding */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 4 }}>Report Branding</h2>
            <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 20 }}>Choose the colors used in your investor reports.</p>

            {/* Palette Dropdown */}
            <div style={{ marginBottom: 24 }} ref={paletteRef}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Color Palette</label>
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setPaletteOpen(!paletteOpen)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: accentColor }} />
                      <div style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${W.border}`, background: secondaryColor }} />
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: reportAccentColor }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>{activePresetName || 'Custom Colors'}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ transform: paletteOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
                {paletteOpen && (
                  <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4, background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    {(Object.keys(COLOR_PRESETS) as ColorPresetKey[]).map((key) => {
                      const preset = COLOR_PRESETS[key]; const isActive = activePresetName === preset.name
                      return (
                        <button key={key} type="button" onClick={() => handlePresetClick(key)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textAlign: 'left' as const, background: isActive ? `${W.accent}08` : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = W.bgAlt }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? `${W.accent}08` : 'transparent' }}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 3, background: preset.primary }} />
                            <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${W.border}`, background: preset.secondary }} />
                            <div style={{ width: 16, height: 16, borderRadius: 3, background: preset.accent }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? W.accent : W.textMid }}>{preset.name}</span>
                          {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2.5" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Custom Colors</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ColorRow label="Primary" description="Headers, chart bars, table headers" value={accentColor} onChange={setAccentColor} />
                <ColorRow label="Secondary" description="Backgrounds, alternating rows" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorRow label="Accent" description="Highlights, trend lines, emphasis" value={reportAccentColor} onChange={setReportAccentColor} />
              </div>
            </div>
          </section>

          {/* Report Sections Builder */}
          <section style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={h2Style}>Report Sections</h2>
              <span style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, textTransform: 'capitalize' as const }}>{TIER_LABELS[activeTier] || activeTier} Plan</span>
            </div>
            <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 20 }}>Configure your default report template. Drag to reorder. Click the lightbulb for section details.</p>

            {/* Structure Preview */}
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${W.borderL}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Structure Preview</span>
                <div style={{ display: 'flex', gap: 2, background: W.bgAlt, borderRadius: 8, padding: 2 }}>
                  {(['outline', 'preview'] as const).map(m => (
                    <button key={m} onClick={() => setPreviewMode(m)} style={{
                      padding: '5px 10px', fontSize: 11, fontWeight: previewMode === m ? 600 : 500, borderRadius: 6, border: 'none', cursor: 'pointer',
                      color: previewMode === m ? W.text : W.textSoft, background: previewMode === m ? W.bg : 'transparent',
                      boxShadow: previewMode === m ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', textTransform: 'capitalize' as const,
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {previewMode === 'outline' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {enabledSections.map((sectionId, idx) => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    return (
                      <div key={sectionId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: W.textMuted, width: 20, textAlign: 'right' as const }}>{idx + 1}.</span>
                        <span style={{ fontSize: 12, color: W.textMid }}>{def.title}</span>
                        {def.visualizations !== 'none' && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FBB040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                          </svg>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ border: `1px solid ${W.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', backgroundColor: accentColor }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{companyName || 'Your Company'}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Property Name | Asset Performance Report | MM/YYYY</div>
                  </div>
                  <div style={{ height: 2, backgroundColor: reportAccentColor }} />
                  {enabledSections.map((sectionId) => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    const hasCharts = (SECTION_CHART_MAP[sectionId] || []).length > 0
                    return (
                      <div key={sectionId} style={{ padding: '10px 16px', borderBottom: `1px solid ${W.borderL}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: W.textMid, marginBottom: 4 }}>{def.title}</div>
                        <div style={{ height: 5, borderRadius: 100, width: '100%', background: secondaryColor, marginBottom: 3 }} />
                        <div style={{ height: 5, borderRadius: 100, width: '80%', background: secondaryColor }} />
                        {def.visualizations === 'kpi-cards' && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                            {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 16, borderRadius: 4, background: secondaryColor }} />)}
                          </div>
                        )}
                        {hasCharts && (
                          <div style={{ marginTop: 6, height: 32, borderRadius: 6, border: `1px dashed ${reportAccentColor}40`, background: `${reportAccentColor}08`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={`${reportAccentColor}60`} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ height: 2, backgroundColor: reportAccentColor }} />
                  <div style={{ padding: '8px 16px', backgroundColor: accentColor, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{companyName || 'Company'} | Confidential</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>Prepared by Writeup AI</span>
                  </div>
                </div>
              )}
            </div>

            {/* Enabled Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {enabledSections.map((sectionId, idx) => {
                const def = ALL_SECTIONS[sectionId]; if (!def) return null
                const charts = SECTION_CHART_MAP[sectionId] || []
                const isExec = sectionId === 'executive_summary'
                const isDragging = draggedIdx === idx
                const isDragOver = dragOverIdx === idx
                const infoOpen = expandedInfo.has(sectionId)
                return (
                  <div key={sectionId}>
                    <div draggable={!isExec} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${isDragging ? `${W.accent}50` : isDragOver ? `${W.accent}60` : W.border}`,
                        background: isDragging ? `${W.accent}06` : isDragOver ? `${W.accent}04` : W.bg,
                        opacity: isDragging ? 0.5 : 1, transition: 'all 0.2s',
                      }}>
                      <div style={{ flexShrink: 0, opacity: isExec ? 0 : 0.4, cursor: isExec ? 'default' : 'grab', color: W.textMuted }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 8h16M4 16h16"/></svg>
                      </div>
                      <button onClick={() => handleToggleSection(sectionId)} disabled={isExec}
                        style={{ flexShrink: 0, width: 32, height: 20, borderRadius: 10, border: 'none', cursor: isExec ? 'not-allowed' : 'pointer', background: W.accent, position: 'relative' as const, transition: 'background 0.2s' }}>
                        <span style={{ position: 'absolute', right: 2, top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.12)', transition: 'all 0.2s' }} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.title}</span>
                          {isExec && <span style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Required</span>}
                          {def.isConditional && <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FEF3C720', padding: '2px 6px', borderRadius: 4 }}>Conditional</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', gap: 3, maxWidth: 140, overflow: 'hidden' }}>
                        {charts.length > 0 ? charts.map(c => (
                          <span key={c} style={{ fontSize: 10, fontWeight: 600, color: W.accent, background: `${W.accent}0D`, border: `1px solid ${W.accent}22`, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{CHART_LABELS[c] || c}</span>
                        )) : <span style={{ fontSize: 10, color: W.textMuted }}>Text only</span>}
                      </div>
                      <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                      {!isExec && (
                        <button onClick={() => handleToggleSection(sectionId)} style={{ flexShrink: 0, padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: W.textMuted, borderRadius: 4, transition: 'color 0.2s' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                    {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                  </div>
                )
              })}
            </div>

            {/* Disabled but available */}
            {(() => {
              const disabled = availableSections.filter(id => !enabledSections.includes(id))
              if (disabled.length === 0) return null
              return (
                <div style={{ borderTop: `1px solid ${W.borderL}`, paddingTop: 16, marginTop: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Available to Add</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {disabled.map(sectionId => {
                      const def = ALL_SECTIONS[sectionId]; if (!def) return null
                      const charts = SECTION_CHART_MAP[sectionId] || []
                      const infoOpen = expandedInfo.has(sectionId)
                      return (
                        <div key={sectionId}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1px dashed ${W.border}`, background: `${W.bgAlt}80`, transition: 'background 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = W.bgAlt}
                            onMouseLeave={(e) => e.currentTarget.style.background = `${W.bgAlt}80`}>
                            <div style={{ width: 16 }} />
                            <button onClick={() => handleToggleSection(sectionId)}
                              style={{ flexShrink: 0, width: 32, height: 20, borderRadius: 10, background: '#E8A0A0', border: 'none', cursor: 'pointer', position: 'relative' as const }}>
                              <span style={{ position: 'absolute', left: 2, top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }} />
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, color: W.textSoft }}>{def.title}</span>
                                {def.isConditional && <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FEF3C720', padding: '2px 6px', borderRadius: 4 }}>Conditional</span>}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, display: 'flex', gap: 3, maxWidth: 140, overflow: 'hidden' }}>
                              {charts.map(c => <span key={c} style={{ fontSize: 10, color: W.textMuted, background: W.bgAlt, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{CHART_LABELS[c] || c}</span>)}
                            </div>
                            <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                          </div>
                          {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Locked sections */}
            {lockedSections.length > 0 && (
              <div style={{ borderTop: `1px solid ${W.borderL}`, paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Upgrade to Unlock</p>
                  {nextTierUp && <a href="/dashboard/pricing" style={{ fontSize: 11, fontWeight: 600, color: W.accent, textDecoration: 'none' }}>View plans</a>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lockedSections.map(sectionId => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    const sectionTier = getSectionTier(sectionId)
                    const infoOpen = expandedInfo.has(sectionId)
                    return (
                      <div key={sectionId}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1px solid ${W.borderL}`, background: `${W.bgAlt}60` }}>
                          <div style={{ width: 16 }} />
                          <div style={{ flexShrink: 0, width: 32, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          </div>
                          <span style={{ flex: 1, fontSize: 13, color: W.textMuted }}>{def.title}</span>
                          <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                          <a href="/dashboard/pricing" style={{
                            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                            fontSize: 10, fontWeight: 700, color: '#fff', background: W.accent,
                            padding: '4px 10px', borderRadius: 100, textDecoration: 'none',
                            boxShadow: `0 2px 8px ${W.accent}30`,
                          }}>
                            {TIER_LABELS[sectionTier]}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
                          </a>
                        </div>
                        {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${W.borderL}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: W.textMuted }}>{enabledSections.length} sections enabled</span>
              <span style={{ fontSize: 12, color: W.textMuted }}>{relevantQuestionCount} guided questions</span>
            </div>
          </section>

          {/* Export Filename */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 4 }}>Export Filename</h2>
            <p style={{ fontSize: 13, color: W.textSoft, marginBottom: 16 }}>Set a template for your PDF export filenames.</p>
            <input type="text" value={exportNameTemplate} onChange={(e) => setExportNameTemplate(e.target.value)}
              placeholder="{property_name}, as of {date}, Investor Report" style={{ ...inputStyle, fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {['{property_name}', '{date}', '{company_name}'].map(t => (
                <button key={t} type="button" onClick={() => setExportNameTemplate(prev => prev + t)}
                  style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: W.accent, background: `${W.accent}0D`, border: `1px solid ${W.accent}22`, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <span style={{ fontSize: 12, color: W.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exportNamePreview}</span>
            </div>
          </section>

          {/* AI Writing Style */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 16 }}>AI Writing Style</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tone</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {(['conservative', 'balanced', 'optimistic'] as const).map((tone) => (
                    <button key={tone} onClick={() => setAiTone(tone)}
                      style={{
                        padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        textTransform: 'capitalize' as const, cursor: 'pointer', transition: 'all 0.2s',
                        color: aiTone === tone ? W.accent : W.textSoft,
                        background: aiTone === tone ? `${W.accent}0D` : W.bgAlt,
                        border: aiTone === tone ? `1.5px solid ${W.accent}35` : `1.5px solid transparent`,
                      }}>{tone}</button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: W.textSoft, marginTop: 8 }}>
                  {aiTone === 'conservative' && 'Factual, understated language. Best for risk-averse investors.'}
                  {aiTone === 'balanced' && 'Professional tone with measured optimism. Standard for most reports.'}
                  {aiTone === 'optimistic' && 'Confident, forward-looking language. Best for value-add strategies.'}
                </p>
              </div>
              <div>
                <label style={labelStyle}>Custom Disclaimer (optional)</label>
                <textarea value={customDisclaimer} onChange={(e) => setCustomDisclaimer(e.target.value)}
                  placeholder="This report is for informational purposes only..." rows={3}
                  style={{ ...inputStyle, resize: 'none' as const }} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          </section>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={handleSave} disabled={isSaving}
              style={{
                padding: '12px 24px', fontSize: 14, fontWeight: 600, color: '#fff', background: W.accent,
                border: 'none', borderRadius: 10, cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1, boxShadow: `0 2px 12px ${W.accent}30`,
              }}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveStatus === 'saved' && (
              <span style={{ color: W.green, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Settings saved
              </span>
            )}
            {saveStatus === 'error' && <span style={{ color: W.red, fontSize: 13, fontWeight: 600 }}>Failed to save</span>}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div style={{ gridColumn: 'span 1' }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: W.textSoft, marginBottom: 12 }}>Report Preview</h3>
            <TemplatePreview primary={accentColor} secondary={secondaryColor} accent={reportAccentColor} companyName={companyName} logoUrl={settings?.company_logo_url} />
            <p style={{ fontSize: 10, color: W.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
              Live preview of your investor report styling.<br/>Colors update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Color Row ───
function ColorRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${W.border}`, cursor: 'pointer', background: value, transition: 'border-color 0.2s' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>{label}</div>
        <div style={{ fontSize: 11, color: W.textMuted }}>{description}</div>
      </div>
      <input type="text" value={value}
        onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v) }}
        style={{ width: 88, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', color: W.textMid, border: `1px solid ${W.border}`, borderRadius: 8, outline: 'none' }}
        maxLength={7} onFocus={onFocus} onBlur={onBlur} />
    </div>
  )
}
