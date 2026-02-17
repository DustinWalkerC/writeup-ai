'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { LogoUploader } from '@/components/logo-uploader'
import { TemplatePreview } from '@/components/template-preview'
import { COLOR_PRESETS, type ColorPresetKey } from '@/lib/branding'
import { ALL_SECTIONS, TIER_SECTIONS, type SectionId } from '@/lib/section-definitions'
import { SECTION_CHART_MAP } from '@/lib/generation-config'
import { CHART_LABELS, ALL_QUESTIONS, SECTION_INFO } from '@/lib/question-section-map'

type UserSettings = {
  id?: string
  user_id?: string
  company_name: string | null
  company_logo_url: string | null
  accent_color: string
  secondary_color?: string
  report_accent_color?: string
  ai_tone: string
  custom_disclaimer: string | null
  report_template?: SectionId[] | null
  export_name_template?: string | null
  created_at?: string
  updated_at?: string
}

type Props = {
  initialSettings: UserSettings | null
  tier: string
}

// ─── Helpers ───

function getAllAvailableSections(tier: string): SectionId[] {
  const tiers: string[] = ['foundational']
  if (tier === 'professional' || tier === 'institutional') tiers.push('professional')
  if (tier === 'institutional') tiers.push('institutional')
  const seen = new Set<SectionId>()
  const result: SectionId[] = []
  for (const t of tiers) {
    for (const id of TIER_SECTIONS[t] || []) {
      if (!seen.has(id)) { seen.add(id); result.push(id) }
    }
  }
  return result
}

function getSectionTier(sectionId: SectionId): string {
  if (TIER_SECTIONS.foundational.includes(sectionId)) return 'foundational'
  if (TIER_SECTIONS.professional.includes(sectionId)) return 'professional'
  return 'institutional'
}

function getAllSectionIds(): SectionId[] {
  const seen = new Set<SectionId>()
  const result: SectionId[] = []
  for (const t of ['foundational', 'professional', 'institutional']) {
    for (const id of TIER_SECTIONS[t] || []) {
      if (!seen.has(id)) { seen.add(id); result.push(id) }
    }
  }
  return result
}

const TIER_LABELS: Record<string, string> = {
  foundational: 'Foundational',
  professional: 'Professional',
  institutional: 'Institutional',
}

// ─── Info Panel (lightbulb expansion) ───

function SectionInfoPanel({ sectionId }: { sectionId: string }) {
  const info = SECTION_INFO[sectionId]
  if (!info) return null
  return (
    <div className="mt-1.5 ml-[52px] mr-2 p-3 bg-gradient-to-r from-cyan-50/80 to-slate-50 rounded-lg border border-cyan-100 text-xs space-y-1.5">
      <p className="text-slate-700 leading-relaxed">{info.summary}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span><span className="font-semibold text-slate-600">Data source:</span> {info.dataSource}</span>
        <span><span className="font-semibold text-slate-600">Your input:</span> {info.guidedInput}</span>
      </div>
    </div>
  )
}

function LightbulbButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`flex-shrink-0 p-1 rounded transition-colors ${isOpen ? 'text-cyan-600 bg-cyan-50' : 'text-slate-300 hover:text-cyan-500 hover:bg-cyan-50/50'}`}
      title="Section details">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </button>
  )
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export function SettingsForm({ initialSettings, tier }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Dev tier override
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

  // Existing form state
  const [companyName, setCompanyName] = useState(initialSettings?.company_name || '')
  const [accentColor, setAccentColor] = useState(initialSettings?.accent_color || '#27272A')
  const [secondaryColor, setSecondaryColor] = useState(initialSettings?.secondary_color || '#EFF6FF')
  const [reportAccentColor, setReportAccentColor] = useState(initialSettings?.report_accent_color || '#2563EB')
  const [aiTone, setAiTone] = useState<'conservative' | 'balanced' | 'optimistic'>(
    (initialSettings?.ai_tone as 'conservative' | 'balanced' | 'optimistic') || 'balanced'
  )
  const [customDisclaimer, setCustomDisclaimer] = useState(initialSettings?.custom_disclaimer || '')

  // Section builder state
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

  const [exportNameTemplate, setExportNameTemplate] = useState(
    initialSettings?.export_name_template || '{property_name}, as of {date}, Investor Report'
  )

  // Info panel + preview state
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set())
  const toggleInfo = useCallback((sectionId: string) => {
    setExpandedInfo(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId)
      return next
    })
  }, [])

  const [previewMode, setPreviewMode] = useState<'outline' | 'preview'>('outline')

  // Palette dropdown
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setPaletteOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activePresetName = (() => {
    for (const key of Object.keys(COLOR_PRESETS) as ColorPresetKey[]) {
      const p = COLOR_PRESETS[key]
      if (accentColor === p.primary && secondaryColor === p.secondary && reportAccentColor === p.accent) return p.name
    }
    return null
  })()

  // Section handlers
  const handleToggleSection = useCallback((sectionId: SectionId) => {
    if (sectionId === 'executive_summary') return
    setEnabledSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    )
  }, [])

  const handleDragStart = useCallback((idx: number) => setDraggedIdx(idx), [])
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }, [])
  const handleDrop = useCallback((targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) { setDraggedIdx(null); setDragOverIdx(null); return }
    setEnabledSections(prev => {
      const n = [...prev]; const [m] = n.splice(draggedIdx, 1); n.splice(targetIdx, 0, m); return n
    })
    setDraggedIdx(null); setDragOverIdx(null)
  }, [draggedIdx])
  const handleDragEnd = useCallback(() => { setDraggedIdx(null); setDragOverIdx(null) }, [])

  // Computed
  const relevantQuestionCount = useMemo(() => {
    const s = new Set(enabledSections)
    return ALL_QUESTIONS.filter(q => q.relatedSections.some(r => s.has(r))).length
  }, [enabledSections])

  const exportNamePreview = useMemo(() => {
    return exportNameTemplate
      .replace('{property_name}', 'Sunset Apartments')
      .replace('{date}', '01/2026')
      .replace('{company_name}', companyName || 'Your Company') + '.pdf'
  }, [exportNameTemplate, companyName])

  const lockedSections = useMemo(() => {
    const available = new Set(availableSections)
    return allSections.filter(id => !available.has(id))
  }, [availableSections, allSections])

  const nextTierUp = activeTier === 'foundational' ? 'professional' : activeTier === 'professional' ? 'institutional' : null

  // Save handler
  const handleSave = async () => {
    setIsSaving(true); setSaveStatus('idle')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName, accent_color: accentColor, secondary_color: secondaryColor,
          report_accent_color: reportAccentColor, ai_tone: aiTone, custom_disclaimer: customDisclaimer,
          report_template: enabledSections, export_name_template: exportNameTemplate,
        }),
      })
      const result = await response.json()
      setSaveStatus(result.success ? 'saved' : 'error')
      if (result.success && result.data) setSettings(result.data)
    } catch (error) {
      console.error('Save error:', error); setSaveStatus('error')
    } finally {
      setIsSaving(false); setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Logo handlers
  const handleLogoUpload = async (file: File) => {
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.success) {
        const sr = await fetch('/api/settings'); const sd = await sr.json()
        if (sd.success) setSettings(sd.data)
      }
    } catch (e) { console.error('Upload error:', e) }
  }
  const handleLogoRemove = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_logo_url: null }),
      })
      const r = await res.json()
      if (r.success) setSettings(prev => prev ? { ...prev, company_logo_url: null } : null)
    } catch (e) { console.error('Remove logo error:', e) }
  }
  const handlePresetClick = (key: ColorPresetKey) => {
    const p = COLOR_PRESETS[key]
    setAccentColor(p.primary); setSecondaryColor(p.secondary); setReportAccentColor(p.accent)
    setPaletteOpen(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-500 mb-8">Customize your reports and branding</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* ═══ Company Info ═══ */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Capital Partners"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
              </div>
              <LogoUploader currentLogoUrl={settings?.company_logo_url || null} onUpload={handleLogoUpload} onRemove={handleLogoRemove} />
            </div>
          </section>

          {/* ═══ Report Branding ═══ */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Report Branding</h2>
            <p className="text-sm text-slate-500 mb-5">Choose the colors used in your investor reports.</p>

            {/* Palette Dropdown */}
            <div className="mb-6" ref={paletteRef}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color Palette</label>
              <div className="relative">
                <button type="button" onClick={() => setPaletteOpen(!paletteOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-5 h-5 rounded" style={{ background: accentColor }} />
                      <div className="w-5 h-5 rounded border border-slate-200" style={{ background: secondaryColor }} />
                      <div className="w-5 h-5 rounded" style={{ background: reportAccentColor }} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{activePresetName || 'Custom Colors'}</span>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${paletteOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {paletteOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {(Object.keys(COLOR_PRESETS) as ColorPresetKey[]).map((key) => {
                      const preset = COLOR_PRESETS[key]
                      const isActive = activePresetName === preset.name
                      return (
                        <button key={key} type="button" onClick={() => handlePresetClick(key)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${isActive ? 'bg-cyan-50' : ''}`}>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-sm" style={{ background: preset.primary }} />
                            <div className="w-4 h-4 rounded-sm border border-slate-200" style={{ background: preset.secondary }} />
                            <div className="w-4 h-4 rounded-sm" style={{ background: preset.accent }} />
                          </div>
                          <span className={`text-sm ${isActive ? 'font-semibold text-cyan-700' : 'text-slate-600'}`}>{preset.name}</span>
                          {isActive && (
                            <svg className="w-4 h-4 text-cyan-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Custom Colors</label>
              <div className="space-y-3">
                <ColorRow label="Primary" description="Headers, chart bars, table headers" value={accentColor} onChange={setAccentColor} />
                <ColorRow label="Secondary" description="Backgrounds, alternating rows" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorRow label="Accent" description="Highlights, trend lines, emphasis" value={reportAccentColor} onChange={setReportAccentColor} />
              </div>
            </div>
          </section>

          {/* ═══ REPORT SECTIONS BUILDER ═══ */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-900">Report Sections</h2>
              <span className="text-xs font-medium text-slate-400 capitalize">{TIER_LABELS[activeTier] || activeTier} Plan</span>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Configure your default report template. Drag to reorder. Click the lightbulb for section details.
            </p>

            {/* ── ENABLED SECTIONS ── */}
            <div className="space-y-1 mb-2">
              {enabledSections.map((sectionId, idx) => {
                const def = ALL_SECTIONS[sectionId]
                if (!def) return null
                const charts = SECTION_CHART_MAP[sectionId] || []
                const isExec = sectionId === 'executive_summary'
                const isDragging = draggedIdx === idx
                const isDragOver = dragOverIdx === idx
                const infoOpen = expandedInfo.has(sectionId)

                return (
                  <div key={sectionId}>
                    <div
                      draggable={!isExec}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                        isDragging ? 'opacity-50 border-cyan-300 bg-cyan-50'
                        : isDragOver ? 'border-cyan-400 shadow-sm bg-cyan-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Drag handle */}
                      <div className={`flex-shrink-0 ${isExec ? 'opacity-0' : 'opacity-40 hover:opacity-70 cursor-grab active:cursor-grabbing'}`}>
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>

                      {/* Toggle ON */}
                      <button onClick={() => handleToggleSection(sectionId)} disabled={isExec}
                        className={`flex-shrink-0 w-8 h-5 rounded-full transition-colors relative ${
                          isExec ? 'bg-cyan-500 cursor-not-allowed' : 'bg-cyan-500 cursor-pointer hover:bg-cyan-600'
                        }`}>
                        <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>

                      {/* Section info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">{def.title}</span>
                          {isExec && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Required</span>}
                          {def.isConditional && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Conditional</span>}
                        </div>
                      </div>

                      {/* Chart badges */}
                      <div className="flex-shrink-0 flex gap-1 max-w-[140px] overflow-hidden">
                        {charts.length > 0 ? charts.map(c => (
                          <span key={c} className="text-[10px] font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {CHART_LABELS[c] || c}
                          </span>
                        )) : <span className="text-[10px] text-slate-300">Text only</span>}
                      </div>

                      <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />

                      {!isExec && (
                        <button onClick={() => handleToggleSection(sectionId)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                  </div>
                )
              })}
            </div>

            {/* ── DISABLED BUT AVAILABLE (visual: dashed, muted) ── */}
            {(() => {
              const disabled = availableSections.filter(id => !enabledSections.includes(id))
              if (disabled.length === 0) return null
              return (
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Available to Add</p>
                  <div className="space-y-1">
                    {disabled.map(sectionId => {
                      const def = ALL_SECTIONS[sectionId]; if (!def) return null
                      const charts = SECTION_CHART_MAP[sectionId] || []
                      const infoOpen = expandedInfo.has(sectionId)
                      return (
                        <div key={sectionId}>
                          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="w-4" />
                            <button onClick={() => handleToggleSection(sectionId)}
                              className="flex-shrink-0 w-8 h-5 rounded-full bg-slate-200 cursor-pointer hover:bg-slate-300 transition-colors relative">
                              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">{def.title}</span>
                                {def.isConditional && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Conditional</span>}
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex gap-1 max-w-[140px] overflow-hidden">
                              {charts.map(c => <span key={c} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">{CHART_LABELS[c] || c}</span>)}
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

            {/* ── LOCKED SECTIONS (above tier — distinct visual) ── */}
            {lockedSections.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upgrade to Unlock</p>
                  {nextTierUp && (
                    <a href="/pricing" className="text-[11px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors">
                      View plans
                    </a>
                  )}
                </div>
                <div className="space-y-1">
                  {lockedSections.map(sectionId => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    const sectionTier = getSectionTier(sectionId)
                    const infoOpen = expandedInfo.has(sectionId)

                    return (
                      <div key={sectionId}>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/80">
                          <div className="w-4" />
                          {/* Lock icon instead of toggle */}
                          <div className="flex-shrink-0 w-8 h-5 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-400">{def.title}</span>
                          </div>
                          {/* Lightbulb on locked sections too */}
                          <LightbulbButton isOpen={infoOpen} onClick={() => toggleInfo(sectionId)} />
                          {/* Upgrade pill per section */}
                          <a href="/pricing"
                            className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 px-2.5 py-1 rounded-full hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm">
                            {TIER_LABELS[sectionTier]}
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                        {infoOpen && <SectionInfoPanel sectionId={sectionId} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer counts */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-400">{enabledSections.length} sections enabled</div>
              <div className="text-xs text-slate-400">{relevantQuestionCount} guided questions</div>
            </div>

            {/* ── Structure Preview ── */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure Preview</span>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setPreviewMode('outline')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${previewMode === 'outline' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                    Outline
                  </button>
                  <button onClick={() => setPreviewMode('preview')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${previewMode === 'preview' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                    Preview
                  </button>
                </div>
              </div>

              {previewMode === 'outline' ? (
                <div className="space-y-0.5">
                  {enabledSections.map((sectionId, idx) => {
                    const def = ALL_SECTIONS[sectionId]; if (!def) return null
                    return (
                      <div key={sectionId} className="flex items-center gap-2 py-1">
                        <span className="text-[10px] font-mono text-slate-300 w-5 text-right">{idx + 1}.</span>
                        <span className="text-xs text-slate-600">{def.title}</span>
                        {def.visualizations !== 'none' && (
                          <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Report header */}
                  <div className="px-4 py-3" style={{ backgroundColor: accentColor }}>
                    <div className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">{companyName || 'Your Company'}</div>
                    <div className="text-[8px] text-white/60 mt-0.5">Property Name | Asset Performance Report | MM/YYYY</div>
                  </div>
                  <div className="h-0.5" style={{ backgroundColor: reportAccentColor }} />

                  {/* Sections */}
                  <div className="divide-y divide-slate-100">
                    {enabledSections.map((sectionId) => {
                      const def = ALL_SECTIONS[sectionId]; if (!def) return null
                      const hasCharts = (SECTION_CHART_MAP[sectionId] || []).length > 0
                      return (
                        <div key={sectionId} className="px-4 py-2.5">
                          <div className="text-[10px] font-semibold text-slate-700 mb-1">{def.title}</div>
                          <div className="space-y-1">
                            <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: secondaryColor }} />
                            <div className="h-1.5 rounded-full w-4/5" style={{ backgroundColor: secondaryColor }} />
                            {def.visualizations === 'kpi-cards' && (
                              <div className="flex gap-1 mt-1.5">
                                {[1,2,3].map(i => <div key={i} className="flex-1 h-4 rounded" style={{ backgroundColor: secondaryColor }} />)}
                              </div>
                            )}
                            {hasCharts && (
                              <div className="mt-1.5 h-8 rounded border border-dashed" style={{ borderColor: reportAccentColor + '40', backgroundColor: reportAccentColor + '08' }}>
                                <div className="flex items-center justify-center h-full">
                                  <svg className="w-3 h-3" style={{ color: reportAccentColor + '60' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Report footer — matches header */}
                  <div className="h-0.5" style={{ backgroundColor: reportAccentColor }} />
                  <div className="px-4 py-2" style={{ backgroundColor: accentColor }}>
                    <div className="flex items-center justify-between">
                      <div className="text-[8px] text-white/50">{companyName || 'Company Name'} | Confidential</div>
                      <div className="text-[8px] text-white/50">Prepared by Writeup AI</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ═══ Export Name Template ═══ */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Export Filename</h2>
            <p className="text-sm text-slate-500 mb-4">Set a template for your PDF export filenames.</p>
            <div>
              <input type="text" value={exportNameTemplate} onChange={(e) => setExportNameTemplate(e.target.value)}
                placeholder="{property_name}, as of {date}, Investor Report"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { token: '{property_name}', label: 'Property Name' },
                  { token: '{date}', label: 'Report Date' },
                  { token: '{company_name}', label: 'Company Name' },
                ].map(v => (
                  <button key={v.token} type="button" onClick={() => setExportNameTemplate(prev => prev + v.token)}
                    className="text-[11px] font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-1 rounded hover:bg-cyan-100 transition-colors">
                    {v.token}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate-400 truncate">{exportNamePreview}</span>
              </div>
            </div>
          </section>

          {/* ═══ AI Writing Style ═══ */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Writing Style</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                <div className="flex gap-2">
                  {(['conservative', 'balanced', 'optimistic'] as const).map((tone) => (
                    <button key={tone} onClick={() => setAiTone(tone)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        aiTone === tone ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>{tone}</button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {aiTone === 'conservative' && 'Factual, understated language. Best for risk-averse investors.'}
                  {aiTone === 'balanced' && 'Professional tone with measured optimism. Standard for most reports.'}
                  {aiTone === 'optimistic' && 'Confident, forward-looking language. Best for value-add strategies.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Disclaimer (optional)</label>
                <textarea value={customDisclaimer} onChange={(e) => setCustomDisclaimer(e.target.value)}
                  placeholder="This report is for informational purposes only..." rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none" />
              </div>
            </div>
          </section>

          {/* ═══ Save ═══ */}
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Settings saved
              </span>
            )}
            {saveStatus === 'error' && <span className="text-red-600 text-sm font-medium">Failed to save</span>}
          </div>
        </div>

        {/* ── Right Column: Live Preview ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Report Preview</h3>
            <TemplatePreview primary={accentColor} secondary={secondaryColor} accent={reportAccentColor} companyName={companyName} logoUrl={settings?.company_logo_url} />
            <p className="text-[10px] text-slate-400 mt-3 text-center leading-tight">
              Live preview of your investor report styling.<br />Colors update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Color Row ───

function ColorRow({ label, description, value, onChange }: {
  label: string; description: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="w-9 h-9 rounded-lg border-2 border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
          style={{ background: value }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-[11px] text-slate-400">{description}</div>
      </div>
      <input type="text" value={value}
        onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v) }}
        className="w-[88px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        maxLength={7} />
    </div>
  )
}
