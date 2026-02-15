'use client'

import { useState, useRef, useEffect } from 'react'
import { LogoUploader } from '@/components/logo-uploader'
import { TemplatePreview } from '@/components/template-preview'
import { COLOR_PRESETS, type ColorPresetKey } from '@/lib/branding'

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
  created_at?: string
  updated_at?: string
}

type Props = {
  initialSettings: UserSettings | null
}

export function SettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Form state
  const [companyName, setCompanyName] = useState(initialSettings?.company_name || '')
  const [accentColor, setAccentColor] = useState(initialSettings?.accent_color || '#27272A')
  const [secondaryColor, setSecondaryColor] = useState(initialSettings?.secondary_color || '#EFF6FF')
  const [reportAccentColor, setReportAccentColor] = useState(initialSettings?.report_accent_color || '#2563EB')
  const [aiTone, setAiTone] = useState<'conservative' | 'balanced' | 'optimistic'>(
    (initialSettings?.ai_tone as 'conservative' | 'balanced' | 'optimistic') || 'balanced'
  )
  const [customDisclaimer, setCustomDisclaimer] = useState(initialSettings?.custom_disclaimer || '')

  // Palette dropdown
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Find active preset
  const activePresetName = (() => {
    for (const key of Object.keys(COLOR_PRESETS) as ColorPresetKey[]) {
      const p = COLOR_PRESETS[key]
      if (accentColor === p.primary && secondaryColor === p.secondary && reportAccentColor === p.accent) {
        return p.name
      }
    }
    return null
  })()

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          accent_color: accentColor,
          secondary_color: secondaryColor,
          report_accent_color: reportAccentColor,
          ai_tone: aiTone,
          custom_disclaimer: customDisclaimer,
        }),
      })
      const result = await response.json()
      setSaveStatus(result.success ? 'saved' : 'error')
      if (result.success && result.data) setSettings(result.data)
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      const result = await response.json()
      if (result.success) {
        const settingsResponse = await fetch('/api/settings')
        const settingsData = await settingsResponse.json()
        if (settingsData.success) setSettings(settingsData.data)
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleLogoRemove = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_logo_url: null }),
      })
      const result = await response.json()
      if (result.success) setSettings(prev => (prev ? { ...prev, company_logo_url: null } : null))
    } catch (error) {
      console.error('Remove logo error:', error)
    }
  }

  const handlePresetClick = (key: ColorPresetKey) => {
    const preset = COLOR_PRESETS[key]
    setAccentColor(preset.primary)
    setSecondaryColor(preset.secondary)
    setReportAccentColor(preset.accent)
    setPaletteOpen(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-500 mb-8">Customize your reports and branding</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Form ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Company Info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Capital Partners"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                />
              </div>
              <LogoUploader
                currentLogoUrl={settings?.company_logo_url || null}
                onUpload={handleLogoUpload}
                onRemove={handleLogoRemove}
              />
            </div>
          </section>

          {/* Report Branding */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Report Branding</h2>
            <p className="text-sm text-slate-500 mb-5">
              Choose the colors used in your investor reports.
            </p>

            {/* ── Preset Palette Dropdown ── */}
            <div className="mb-6" ref={paletteRef}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Color Palette
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(!paletteOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-5 h-5 rounded" style={{ background: accentColor }} />
                      <div className="w-5 h-5 rounded border border-slate-200" style={{ background: secondaryColor }} />
                      <div className="w-5 h-5 rounded" style={{ background: reportAccentColor }} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {activePresetName || 'Custom Colors'}
                    </span>
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
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePresetClick(key)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                            isActive ? 'bg-cyan-50' : ''
                          }`}
                        >
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-sm" style={{ background: preset.primary }} />
                            <div className="w-4 h-4 rounded-sm border border-slate-200" style={{ background: preset.secondary }} />
                            <div className="w-4 h-4 rounded-sm" style={{ background: preset.accent }} />
                          </div>
                          <span className={`text-sm ${isActive ? 'font-semibold text-cyan-700' : 'text-slate-600'}`}>
                            {preset.name}
                          </span>
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

            {/* ── Custom Colors Section ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Custom Colors
              </label>
              <div className="space-y-3">
                {/* Primary */}
                <ColorRow
                  label="Primary"
                  description="Headers, chart bars, table headers"
                  value={accentColor}
                  onChange={setAccentColor}
                />
                {/* Secondary */}
                <ColorRow
                  label="Secondary"
                  description="Backgrounds, alternating rows"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
                {/* Accent */}
                <ColorRow
                  label="Accent"
                  description="Highlights, trend lines, emphasis"
                  value={reportAccentColor}
                  onChange={setReportAccentColor}
                />
              </div>
            </div>
          </section>

          {/* AI Settings */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Writing Style</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                <div className="flex gap-2">
                  {(['conservative', 'balanced', 'optimistic'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setAiTone(tone)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        aiTone === tone
                          ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tone}
                    </button>
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
                <textarea
                  value={customDisclaimer}
                  onChange={(e) => setCustomDisclaimer(e.target.value)}
                  placeholder="This report is for informational purposes only..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
                />
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all disabled:opacity-50"
            >
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
            {saveStatus === 'error' && (
              <span className="text-red-600 text-sm font-medium">Failed to save</span>
            )}
          </div>
        </div>

        {/* ── Right Column: Live Preview ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Report Preview</h3>
            <TemplatePreview
              primary={accentColor}
              secondary={secondaryColor}
              accent={reportAccentColor}
              companyName={companyName}
              logoUrl={settings?.company_logo_url}
            />
            <p className="text-[10px] text-slate-400 mt-3 text-center leading-tight">
              Live preview of your investor report styling.
              <br />Colors update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Color Row Component — swatch + hex input
// ─────────────────────────────────────────

function ColorRow({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Native color picker swatch */}
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="w-9 h-9 rounded-lg border-2 border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
          style={{ background: value }}
        />
      </div>
      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-[11px] text-slate-400">{description}</div>
      </div>
      {/* Hex input */}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
        }}
        className="w-[88px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        maxLength={7}
      />
    </div>
  )
}
