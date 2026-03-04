'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { LogoUploader } from '@/components/logo-uploader'
import { COLOR_PRESETS, type ColorPresetKey } from '@/lib/branding'
import { ALL_SECTIONS, TIER_SECTIONS, type SectionId } from '@/lib/section-definitions'
import { SECTION_CHART_MAP } from '@/lib/generation-config'
import { CHART_LABELS, ALL_QUESTIONS, SECTION_INFO } from '@/lib/question-section-map'

import ReportStylePanel, { DEFAULT_AI_PREFERENCES, type AIPreferences } from '@/components/report-style-panel'

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type UserSettings = {
  id?: string; user_id?: string; company_name: string | null; company_logo_url: string | null
  accent_color: string; secondary_color?: string; report_accent_color?: string
  ai_tone: string; custom_disclaimer: string | null; report_template?: SectionId[] | null
  export_name_template?: string | null; created_at?: string; updated_at?: string
  ai_preferences?: AIPreferences | null
  paragraph_targets?: Record<string, number> | null
}

type Props = { initialSettings: UserSettings | null; tier: string }

// ═══════════════════════════════════════════════════════════
// WCAG AA Compliant Design Tokens
// ═══════════════════════════════════════════════════════════

const W = {
  accent: '#00B7DB', accentD: '#1D98B1',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A',
  textSoft: '#5A5A5A',
  textMuted: '#6B6B6B',
  labelMuted: '#808080',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000', gold: '#C8B88A',
}

// ═══════════════════════════════════════════════════════════
// Mobile Responsive CSS
// ═══════════════════════════════════════════════════════════

const SETTINGS_MOBILE_CSS = `
@media (max-width: 900px) {
  .settings-split-layout {
    grid-template-columns: 1fr !important;
  }
  .settings-preview-col {
    position: relative !important;
    top: 0 !important;
  }
}
@media (max-width: 768px) {
  .settings-preview-col {
    display: none !important;
  }
  .settings-page-wrap {
    padding-bottom: 72px !important;
  }
  .settings-section-row {
    flex-wrap: wrap !important;
    gap: 6px !important;
    padding: 8px 10px !important;
  }
  .settings-section-row .settings-chart-badges {
    display: none !important;
  }
  .settings-section-row .settings-para-stepper {
    margin-left: auto !important;
  }
  .settings-color-hex {
    width: 72px !important;
    font-size: 11px !important;
  }
  .settings-token-row {
    flex-wrap: wrap !important;
    gap: 4px !important;
  }
  .settings-token-btn {
    font-size: 10px !important;
    padding: 3px 6px !important;
  }
  .settings-save-bar-mobile {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    background: #fff !important;
    border-top: 1px solid #E8E5E0 !important;
    padding: 12px 20px !important;
    z-index: 30 !important;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.06) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
  }
  .settings-color-row {
    gap: 8px !important;
  }
  .settings-color-label {
    display: none !important;
  }
  .settings-filename-preview {
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
}
`

const cardStyle: React.CSSProperties = { background: W.bg, border: `1px solid ${W.border}`, borderRadius: 14, padding: 24 }
const h2Style: React.CSSProperties = { fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 18, fontWeight: 500, color: W.text, margin: 0 }
const descStyle: React.CSSProperties = { fontSize: 13, color: W.textSoft, marginTop: 4, marginBottom: 0, lineHeight: 1.5 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: W.textMid, marginBottom: 4 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 16px', fontSize: 14, color: W.text,
  fontFamily: 'var(--font-body, sans-serif)',
  background: W.bg, border: `1px solid ${W.border}`, borderRadius: 10,
  outline: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
  boxSizing: 'border-box' as const,
}
const upperLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: W.labelMuted,
  textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8,
}

function onFocus(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${W.accent}15` }
function onBlur(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor = W.border; e.currentTarget.style.boxShadow = 'none' }

// ═══════════════════════════════════════════════════════════
// Section Helpers
// ═══════════════════════════════════════════════════════════

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

const DEFAULT_PARAGRAPH_TARGETS: Record<string, number> = {
  executive_summary: 4, noi_performance: 3, expense_analysis: 3,
  revenue_analysis: 3, occupancy_leasing: 3, capital_expenditures: 2,
  debt_service: 2, market_comparison: 3, risk_assessment: 3,
  asset_manager_outlook: 3, distribution_update: 2,
  revenue_summary: 3, expense_summary: 3, budget_vs_actual: 3,
  rent_roll_insights: 3, rent_roll_deep_dive: 3, market_positioning: 3,
  capital_improvements: 2, risk_watch_items: 3, investment_thesis_update: 3,
  lease_expiration_rollover: 3, market_submarket_analysis: 3,
  capital_improvements_tracker: 2, risk_matrix: 3,
  resident_operational_metrics: 3, regulatory_compliance: 2,
  asset_manager_strategic_outlook: 3,
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function SectionInfoPanel({ sectionId }: { sectionId: string }) {
  const info = SECTION_INFO[sectionId]; if (!info) return null
  return (
    <div style={{ marginTop: 4, marginLeft: 52, marginRight: 8, padding: 12, background: `${W.accent}06`, border: `1px solid ${W.accent}15`, borderRadius: 10, fontSize: 12 }}>
      <p style={{ color: W.textMid, lineHeight: 1.5, margin: 0 }}>{info.summary}</p>
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
        color: isOpen ? '#D97706' : '#D4A043', background: isOpen ? '#FEF3C720' : 'transparent',
        transition: 'all 0.2s',
      }} title="Section details">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    </button>
  )
}

function ColorRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="settings-color-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${W.border}`, cursor: 'pointer', background: value, transition: 'border-color 0.2s' }} />
      </div>
      <div className="settings-color-label" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>{label}</div>
        <div style={{ fontSize: 11, color: W.textSoft }}>{description}</div>
      </div>
      <input className="settings-color-hex" type="text" value={value}
        onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v) }}
        style={{ width: 88, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', color: W.textMid, border: `1px solid ${W.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }}
        maxLength={7} onFocus={onFocus} onBlur={onBlur} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Live Report Preview
// ═══════════════════════════════════════════════════════════

const PAGE_CAPACITY = 44
const FIRST_PAGE_HEADER = 10
const SECTION_TITLE = 2
const PARAGRAPH_COST = 2.5
const CHART_COST = 5
const PAGE_FOOTER = 2

function estimatePageCount(enabledSections: SectionId[], paragraphTargets: Record<string, number>): number {
  let totalUnits = FIRST_PAGE_HEADER
  for (const sectionId of enabledSections) {
    const paras = paragraphTargets[sectionId] || DEFAULT_PARAGRAPH_TARGETS[sectionId] || 3
    const charts = SECTION_CHART_MAP[sectionId] || []
    totalUnits += SECTION_TITLE + paras * PARAGRAPH_COST + (charts.length > 0 ? CHART_COST : 0)
  }
  const usablePerPage = PAGE_CAPACITY - PAGE_FOOTER
  return Math.max(1, Math.ceil(totalUnits / usablePerPage))
}

function LiveReportPreview({
  companyName, accentColor, secondaryColor, reportAccentColor,
  enabledSections, paragraphTargets, logoUrl,
}: {
  companyName: string; accentColor: string; secondaryColor: string; reportAccentColor: string
  enabledSections: SectionId[]; paragraphTargets: Record<string, number>; logoUrl?: string | null
}) {
  const estPages = useMemo(() => estimatePageCount(enabledSections, paragraphTargets), [enabledSections, paragraphTargets])
  const totalCharts = enabledSections.filter(id => (SECTION_CHART_MAP[id] || []).length > 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: W.textMuted }}>{enabledSections.length} sections · {totalCharts} charts</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: W.accent, background: `${W.accent}0D`, padding: '3px 10px', borderRadius: 100 }}>Est. {estPages} {estPages === 1 ? 'page' : 'pages'}</span>
      </div>
      <div style={{ border: `1px solid ${W.border}`, borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '14px 20px', backgroundColor: accentColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 18, maxWidth: 60, objectFit: 'contain', opacity: 0.9, borderRadius: 2 }} />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineHeight: 1.3, letterSpacing: '0.02em' }}>{companyName || 'Your Company'}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.2 }}>Monthly Investor Report — Property Name</div>
            </div>
          </div>
        </div>
        <div style={{ height: 2, backgroundColor: reportAccentColor }} />
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {enabledSections.map((sectionId, idx) => {
            const def = ALL_SECTIONS[sectionId]; if (!def) return null
            const charts = SECTION_CHART_MAP[sectionId] || []
            const hasCharts = charts.length > 0
            const paragraphs = paragraphTargets[sectionId] || DEFAULT_PARAGRAPH_TARGETS[sectionId] || 3
            const isFirst = idx === 0
            return (
              <div key={sectionId} style={{ padding: '12px 20px', borderBottom: `1px solid ${W.borderL}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: W.text, lineHeight: 1.3 }}>{def.title}</div>
                </div>
                {isFirst && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, padding: '6px 8px', borderRadius: 4, background: secondaryColor, border: `1px solid ${W.borderL}` }}>
                        <div style={{ height: 3, width: '60%', borderRadius: 100, background: `${W.labelMuted}40`, marginBottom: 3 }} />
                        <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>{i === 1 ? '91.4%' : i === 2 ? '$113.8K' : '$277.8K'}</div>
                        <div style={{ height: 2, width: '40%', borderRadius: 100, background: `${W.green}50`, marginTop: 2 }} />
                      </div>
                    ))}
                  </div>
                )}
                {Array.from({ length: Math.min(paragraphs, 5) }).map((_, pIdx) => (
                  <div key={pIdx} style={{ marginBottom: pIdx < paragraphs - 1 ? 5 : 0 }}>
                    <div style={{ height: 3, borderRadius: 100, background: secondaryColor, width: '100%', marginBottom: 2 }} />
                    <div style={{ height: 3, borderRadius: 100, background: secondaryColor, width: '95%', marginBottom: 2 }} />
                    <div style={{ height: 3, borderRadius: 100, background: secondaryColor, width: pIdx === paragraphs - 1 ? '55%' : '85%' }} />
                  </div>
                ))}
                {hasCharts && (
                  <div style={{ marginTop: 6, height: 36, borderRadius: 6, border: `1px dashed ${reportAccentColor}40`, background: `${reportAccentColor}06`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={`${reportAccentColor}70`} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <span style={{ fontSize: 8, fontWeight: 600, color: `${reportAccentColor}80`, lineHeight: 1 }}>{charts.map(c => CHART_LABELS[c] || c).join(', ')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ height: 2, backgroundColor: reportAccentColor }} />
        <div style={{ padding: '8px 20px', backgroundColor: accentColor, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{companyName || 'Company'} | Confidential</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>Prepared by WriteUp AI</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function SettingsForm({ initialSettings, tier }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [activeTier, setActiveTier] = useState(tier)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const markDirty = useCallback(() => setHasUnsavedChanges(true), [])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const stored = localStorage.getItem('writeup_tier_override')
      if (stored && stored !== 'none') setActiveTier(stored)
    }
    const handler = (e: CustomEvent) => setActiveTier(e.detail === 'none' ? tier : e.detail)
    window.addEventListener('tierOverrideChanged', handler as EventListener)
    return () => window.removeEventListener('tierOverrideChanged', handler as EventListener)
  }, [tier])

  const hasUnsavedRef = useRef(hasUnsavedChanges)
  useEffect(() => { hasUnsavedRef.current = hasUnsavedChanges }, [hasUnsavedChanges])
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) { e.preventDefault(); e.returnValue = 'You have unsaved settings changes. Leave without saving?' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ─── State ───
  const [companyName, setCompanyName] = useState(initialSettings?.company_name || '')
  const [accentColor, setAccentColor] = useState(initialSettings?.accent_color || '#27272A')
  const [secondaryColor, setSecondaryColor] = useState(initialSettings?.secondary_color || '#EFF6FF')
  const [reportAccentColor, setReportAccentColor] = useState(initialSettings?.report_accent_color || '#2563EB')
  const [customDisclaimer, setCustomDisclaimer] = useState(initialSettings?.custom_disclaimer || '')
  const [exportNameTemplate, setExportNameTemplate] = useState(initialSettings?.export_name_template || '{property_name}, as of {date}, Investor Report')

  const [aiPreferences, setAIPreferences] = useState<AIPreferences>(
    (initialSettings?.ai_preferences as AIPreferences) || DEFAULT_AI_PREFERENCES
  )

  const [paragraphTargets, setParagraphTargets] = useState<Record<string, number>>(() => {
    if (initialSettings?.paragraph_targets) return { ...DEFAULT_PARAGRAPH_TARGETS, ...initialSettings.paragraph_targets }
    return { ...DEFAULT_PARAGRAPH_TARGETS }
  })

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

  const updateCompanyName = (v: string) => { setCompanyName(v); markDirty() }
  const updateAccentColor = (v: string) => { setAccentColor(v); markDirty() }
  const updateSecondaryColor = (v: string) => { setSecondaryColor(v); markDirty() }
  const updateReportAccentColor = (v: string) => { setReportAccentColor(v); markDirty() }
  const updateExportNameTemplate = (v: string) => { setExportNameTemplate(v); markDirty() }
  const updateCustomDisclaimer = (v: string) => { setCustomDisclaimer(v); markDirty() }
  const updateAIPreferences = (v: AIPreferences) => { setAIPreferences(v); markDirty() }

  const handleParagraphChange = useCallback((sectionId: string, value: number) => {
    setParagraphTargets(prev => ({ ...prev, [sectionId]: value }))
    markDirty()
  }, [markDirty])

  // ─── Section toggles ───
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
    markDirty()
  }, [markDirty])

  const handleDragStart = useCallback((idx: number) => setDraggedIdx(idx), [])
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }, [])
  const handleDrop = useCallback((targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) { setDraggedIdx(null); setDragOverIdx(null); return }
    setEnabledSections(prev => { const n = [...prev]; const [m] = n.splice(draggedIdx, 1); n.splice(targetIdx, 0, m); return n })
    setDraggedIdx(null); setDragOverIdx(null); markDirty()
  }, [draggedIdx, markDirty])
  const handleDragEnd = useCallback(() => { setDraggedIdx(null); setDragOverIdx(null) }, [])

  const relevantQuestionCount = useMemo(() => {
    const s = new Set(enabledSections)
    return ALL_QUESTIONS.filter(q => q.relatedSections.some(r => s.has(r))).length
  }, [enabledSections])

  const exportNamePreview = useMemo(() => {
    return exportNameTemplate
      .replace('{property_name}', 'Sunset Apartments')
      .replace('{company_name}', companyName || 'Your Company')
      .replace('{date_full}', '01/2026')
      .replace('{date_short}', '1/26')
      .replace('{month_name}', 'January 2026')
      .replace('{month}', '01')
      .replace('{year}', '2026')
      .replace('{date}', '01/2026') + '.pdf'
  }, [exportNameTemplate, companyName])

  const lockedSections = useMemo(() => {
    const available = new Set(availableSections); return allSections.filter(id => !available.has(id))
  }, [availableSections, allSections])

  const nextTierUp = activeTier === 'foundational' ? 'professional' : activeTier === 'professional' ? 'institutional' : null

  const handlePresetClick = (key: ColorPresetKey) => {
    const p = COLOR_PRESETS[key]; updateAccentColor(p.primary); updateSecondaryColor(p.secondary); updateReportAccentColor(p.accent); setPaletteOpen(false)
  }

  // ═══════════════════════════════════════════════════════════
  // Unified Save
  // ═══════════════════════════════════════════════════════════

  const handleSave = async () => {
    setIsSaving(true); setSaveStatus('idle')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName, accent_color: accentColor, secondary_color: secondaryColor,
          report_accent_color: reportAccentColor, custom_disclaimer: customDisclaimer,
          report_template: enabledSections, export_name_template: exportNameTemplate,
          ai_preferences: aiPreferences, paragraph_targets: paragraphTargets,
        }),
      })
      const result = await response.json()
      if (result.success) { setSaveStatus('saved'); setHasUnsavedChanges(false); if (result.data) setSettings(result.data) }
      else { setSaveStatus('error') }
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

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="settings-page-wrap" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{SETTINGS_MOBILE_CSS}</style>

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 500, color: W.text, letterSpacing: '-0.015em', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: W.textSoft, margin: '4px 0 0' }}>Customize your reports and branding</p>
      </div>

      {/* ═══ Mobile Save Bar (hidden on desktop, visible on mobile) ═══ */}
      <div className="settings-save-bar-mobile" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasUnsavedChanges && (
            <span style={{ fontSize: 11, fontWeight: 500, color: W.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: W.gold }} />
              Unsaved
            </span>
          )}
          {saveStatus === 'saved' && <span style={{ color: W.green, fontSize: 12, fontWeight: 600 }}>Saved</span>}
          {saveStatus === 'error' && <span style={{ color: W.red, fontSize: 12, fontWeight: 600 }}>Failed</span>}
        </div>
        <button onClick={handleSave} disabled={isSaving}
          style={{ padding: '9px 24px', fontSize: 13, fontWeight: 600, color: '#fff', background: W.green, border: 'none', borderRadius: 10, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1, boxShadow: `0 2px 12px ${W.green}30` }}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ═══ SPLIT LAYOUT ═══ */}
      <div className="settings-split-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

        {/* ─── LEFT: Settings Panels ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ══════ SECTION 1: Brand & Identity ══════ */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 20 }}>Brand & Identity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input type="text" value={companyName} onChange={(e) => updateCompanyName(e.target.value)}
                  placeholder="Acme Capital Partners" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <LogoUploader currentLogoUrl={settings?.company_logo_url || null} onUpload={handleLogoUpload} onRemove={handleLogoRemove} />
              <div style={{ height: 1, background: W.borderL }} />

              {/* Color Palette */}
              <div ref={paletteRef}>
                <label style={upperLabel}>Color Palette</label>
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
                <label style={upperLabel}>Custom Colors</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ColorRow label="Primary" description="Headers, chart bars, table headers" value={accentColor} onChange={updateAccentColor} />
                  <ColorRow label="Secondary" description="Backgrounds, alternating rows" value={secondaryColor} onChange={updateSecondaryColor} />
                  <ColorRow label="Accent" description="Highlights, trend lines, emphasis" value={reportAccentColor} onChange={updateReportAccentColor} />
                </div>
              </div>

              <div style={{ height: 1, background: W.borderL }} />

              {/* Export Filename */}
              <div>
                <label style={labelStyle}>Export Filename</label>
                <p style={{ ...descStyle, marginBottom: 12 }}>Template for your PDF export filenames.</p>
                <input type="text" value={exportNameTemplate} onChange={(e) => updateExportNameTemplate(e.target.value)}
                  placeholder="{property_name}, as of {date}, Investor Report" style={{ ...inputStyle, fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
                <div className="settings-token-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {[
                    { token: '{property_name}', tip: 'Sunset Apartments' },
                    { token: '{company_name}', tip: companyName || 'Your Company' },
                    { token: '{date_full}', tip: '01/2026' },
                    { token: '{date_short}', tip: '1/26' },
                    { token: '{month_name}', tip: 'January 2026' },
                    { token: '{month}', tip: '01' },
                    { token: '{year}', tip: '2026' },
                  ].map(v => (
                    <button className="settings-token-btn" key={v.token} type="button" title={v.tip} onClick={() => updateExportNameTemplate(exportNameTemplate + v.token)}
                      style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: W.accent, background: `${W.accent}0D`, border: `1px solid ${W.accent}22`, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                      {v.token}
                    </button>
                  ))}
                </div>
                <div className="settings-filename-preview" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span style={{ fontSize: 12, color: W.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exportNamePreview}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ══════ SECTION 2: Report Template ══════ */}
          <section style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={h2Style}>Report Template</h2>
              <span style={{ fontSize: 11, fontWeight: 600, color: W.labelMuted, textTransform: 'capitalize' as const }}>{TIER_LABELS[activeTier] || activeTier} Plan</span>
            </div>
            <p style={descStyle}>Configure your default report sections. Drag to reorder. Adjust paragraph density per section.</p>

            {/* Structure Preview Toggle */}
            <div style={{ marginTop: 20, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${W.borderL}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={upperLabel}>Structure Preview</span>
                <div style={{ display: 'flex', gap: 2, background: W.bgAlt, borderRadius: 8, padding: 2 }}>
                  {(['outline', 'preview'] as const).map(m => (
                    <button key={m} onClick={() => setPreviewMode(m)} style={{
                      padding: '5px 10px', fontSize: 11, fontWeight: previewMode === m ? 600 : 500, borderRadius: 6, border: 'none', cursor: 'pointer',
                      color: previewMode === m ? W.text : W.textSoft, background: previewMode === m ? W.bg : 'transparent',
                      boxShadow: previewMode === m ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', textTransform: 'capitalize' as const,
                      transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4A043" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        )}
                        <span style={{ fontSize: 10, color: W.textMuted, marginLeft: 'auto' }}>{paragraphTargets[sectionId] || DEFAULT_PARAGRAPH_TARGETS[sectionId] || 3}p</span>
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
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>Prepared by WriteUp AI</span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Enabled Sections (draggable) ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {enabledSections.map((sectionId, idx) => {
                const def = ALL_SECTIONS[sectionId]; if (!def) return null
                const charts = SECTION_CHART_MAP[sectionId] || []
                const isExec = sectionId === 'executive_summary'
                const isDragging = draggedIdx === idx
                const isDragOver = dragOverIdx === idx
                const infoOpen = expandedInfo.has(sectionId)
                const paraCount = paragraphTargets[sectionId] || DEFAULT_PARAGRAPH_TARGETS[sectionId] || 3
                return (
                  <div key={sectionId}>
                    <div className="settings-section-row" draggable={!isExec} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${isDragging ? `${W.accent}50` : isDragOver ? `${W.accent}60` : W.border}`,
                        background: isDragging ? `${W.accent}06` : isDragOver ? `${W.accent}04` : W.bg,
                        opacity: isDragging ? 0.5 : 1, transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
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
                      {/* Chart badges — hidden on mobile */}
                      <div className="settings-chart-badges" style={{ flexShrink: 0, display: 'flex', gap: 3, maxWidth: 120, overflow: 'hidden' }}>
                        {charts.length > 0 ? charts.slice(0, 2).map(c => (
                          <span key={c} style={{ fontSize: 10, fontWeight: 600, color: W.accent, background: `${W.accent}0D`, border: `1px solid ${W.accent}22`, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{CHART_LABELS[c] || c}</span>
                        )) : <span style={{ fontSize: 10, color: W.textMuted }}>Text only</span>}
                      </div>
                      {/* Paragraph stepper */}
                      <div className="settings-para-stepper" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, background: W.bgAlt, borderRadius: 6, padding: '2px 4px' }}>
                        <button onClick={() => handleParagraphChange(sectionId, Math.max(1, paraCount - 1))}
                          style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: paraCount <= 1 ? W.borderL : W.textSoft, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>-</button>
                        <span style={{ fontSize: 12, fontWeight: 600, color: W.textMid, minWidth: 22, textAlign: 'center' as const, fontFamily: 'var(--font-body, sans-serif)' }}>{paraCount}p</span>
                        <button onClick={() => handleParagraphChange(sectionId, Math.min(8, paraCount + 1))}
                          style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: paraCount >= 8 ? W.borderL : W.textSoft, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>+</button>
                      </div>
                      <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                      {!isExec && (
                        <button onClick={() => handleToggleSection(sectionId)} style={{ flexShrink: 0, padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: W.textMuted, borderRadius: 4, transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = W.red}
                          onMouseLeave={(e) => e.currentTarget.style.color = W.textMuted}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                    {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                  </div>
                )
              })}
            </div>

            {/* ─── Available to Add ─── */}
            {(() => {
              const disabled = availableSections.filter(id => !enabledSections.includes(id))
              if (disabled.length === 0) return null
              return (
                <div style={{ borderTop: `1px solid ${W.borderL}`, paddingTop: 16, marginTop: 16 }}>
                  <p style={upperLabel}>Available to Add</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {disabled.map(sectionId => {
                      const def = ALL_SECTIONS[sectionId]; if (!def) return null
                      const charts = SECTION_CHART_MAP[sectionId] || []
                      const infoOpen = expandedInfo.has(sectionId)
                      return (
                        <div key={sectionId}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1px dashed ${W.border}`, background: `${W.bgAlt}80`, transition: 'background 0.15s', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = W.bgAlt}
                            onMouseLeave={(e) => e.currentTarget.style.background = `${W.bgAlt}80`}>
                            <div style={{ width: 16 }} />
                            <button onClick={() => handleToggleSection(sectionId)}
                              style={{ flexShrink: 0, width: 32, height: 20, borderRadius: 10, background: '#D4A0A0', border: 'none', cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s' }}>
                              <span style={{ position: 'absolute', left: 2, top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }} />
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, color: W.textSoft }}>{def.title}</span>
                                {def.isConditional && <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FEF3C720', padding: '2px 6px', borderRadius: 4 }}>Conditional</span>}
                              </div>
                            </div>
                            <div className="settings-chart-badges" style={{ flexShrink: 0, display: 'flex', gap: 3, maxWidth: 120, overflow: 'hidden' }}>
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

            {/* ─── Locked sections ─── */}
            {lockedSections.length > 0 && (
              <div style={{ borderTop: `1px solid ${W.borderL}`, paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ ...upperLabel, marginBottom: 0 }}>Premium Sections</p>
                  {nextTierUp && <a href="/dashboard/pricing" style={{ fontSize: 11, fontWeight: 600, color: W.accent, textDecoration: 'none' }}>Explore plans</a>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lockedSections.map(sectionId => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    const sectionTier = getSectionTier(sectionId)
                    const infoOpen = expandedInfo.has(sectionId)
                    return (
                      <div key={sectionId}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${W.borderL}`, background: `${W.bgAlt}60` }}>
                          <div style={{ width: 16 }} />
                          <div style={{ flexShrink: 0, width: 32, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>{def.title}</span>
                          </div>
                          <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                          <a href="/dashboard/pricing" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: W.accent, padding: '4px 10px', borderRadius: 100, textDecoration: 'none', boxShadow: `0 2px 8px ${W.accent}30` }}>
                            Unlock
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

          {/* ══════ SECTION 3: WriteUp Intelligence ══════ */}
          <section style={cardStyle}>
            <h2 style={{ ...h2Style, marginBottom: 4 }}>WriteUp Intelligence</h2>
            <p style={descStyle}>Fine-tune how your reports are written and analyzed.</p>
            <div style={{ marginTop: 20 }}>
              <ReportStylePanel
                preferences={aiPreferences}
                onChange={updateAIPreferences}
                tier={activeTier as any}
                onSave={markDirty}
                isSaving={false}
                {...{ hideSaveButton: true } as any}
              />
            </div>
          </section>

        </div>

        {/* ─── RIGHT: Sticky Preview ─── */}
        <div className="settings-preview-col" style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasUnsavedChanges && (
                <span style={{ fontSize: 11, fontWeight: 500, color: W.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: W.gold }} />
                  Unsaved
                </span>
              )}
              {saveStatus === 'saved' && (
                <span style={{ color: W.green, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved
                </span>
              )}
              {saveStatus === 'error' && <span style={{ color: W.red, fontSize: 12, fontWeight: 600 }}>Failed</span>}
            </div>
            <button onClick={handleSave} disabled={isSaving}
              style={{
                padding: '9px 24px', fontSize: 13, fontWeight: 600, color: '#fff', background: W.green,
                border: 'none', borderRadius: 10, cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1, boxShadow: `0 2px 12px ${W.green}30`,
                transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
              }}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: W.textSoft, marginBottom: 8 }}>Live Report Preview</h3>
          <LiveReportPreview
            companyName={companyName} accentColor={accentColor} secondaryColor={secondaryColor}
            reportAccentColor={reportAccentColor} enabledSections={enabledSections}
            paragraphTargets={paragraphTargets} logoUrl={settings?.company_logo_url}
          />
        </div>

      </div>
    </div>
  )
}
