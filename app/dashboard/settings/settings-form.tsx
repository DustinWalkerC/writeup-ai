'use client'

import { useState, useEffect } from 'react'
import { LogoUploader } from '@/components/logo-uploader'
import { ColorPicker } from '@/components/color-picker'
import { generateColorPalette, getContrastColor } from '@/lib/branding'

// Define type locally
type UserSettings = {
  id?: string
  user_id?: string
  company_name: string | null
  company_logo_url: string | null
  accent_color: string
  secondary_color?: string
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
  const [aiTone, setAiTone] = useState<'conservative' | 'balanced' | 'optimistic'>(
    (initialSettings?.ai_tone as 'conservative' | 'balanced' | 'optimistic') || 'balanced'
  )
  const [customDisclaimer, setCustomDisclaimer] = useState(initialSettings?.custom_disclaimer || '')

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
          ai_tone: aiTone,
          custom_disclaimer: customDisclaimer,
        }),
      })

      const result = await response.json()
      setSaveStatus(result.success ? 'saved' : 'error')

      if (result.success && result.data) {
        setSettings(result.data)
      }
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
      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        // Refresh settings to get new logo URL
        const settingsResponse = await fetch('/api/settings')
        const settingsData = await settingsResponse.json()
        if (settingsData.success) {
          setSettings(settingsData.data)
        }
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
      if (result.success) {
        setSettings(prev => (prev ? { ...prev, company_logo_url: null } : null))
      }
    } catch (error) {
      console.error('Remove logo error:', error)
    }
  }

  const palette = generateColorPalette(accentColor)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-500 mb-8">Customize your reports and branding</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Company Info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name
                </label>
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

          {/* Branding */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Branding</h2>

            <ColorPicker
              label="Brand Colors"
              value={accentColor}
              secondaryValue={secondaryColor}
              onChange={setAccentColor}
              onSecondaryChange={setSecondaryColor}
            />
          </section>

          {/* AI Settings */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Writing Style</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tone
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Disclaimer (optional)
                </label>
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

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-medium transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 text-sm font-medium">✓ Settings saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600 text-sm font-medium">Failed to save</span>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Preview</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Header Preview */}
              <div
                className="p-4"
                style={{ backgroundColor: accentColor }}
              >
                {settings?.company_logo_url ? (
                  <img
                    src={settings.company_logo_url}
                    alt="Logo"
                    className="h-8 object-contain"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                ) : (
                  <span
                    className="font-semibold"
                    style={{ color: getContrastColor(accentColor) }}
                  >
                    {companyName || 'Your Company'}
                  </span>
                )}
              </div>

              {/* Body Preview */}
              <div className="p-4 space-y-3">
                <div
                  className="text-sm font-semibold"
                  style={{ color: accentColor }}
                >
                  Executive Summary
                </div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
                <div className="h-2 bg-slate-200 rounded w-4/5"></div>
                <div className="h-2 bg-slate-200 rounded w-3/5"></div>

                {/* KPI Preview */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: palette.primaryLight }}
                  >
                    <div className="text-xs text-slate-500">Occupancy</div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: accentColor }}
                    >
                      94.5%
                    </div>
                  </div>
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: palette.primaryLight }}
                  >
                    <div className="text-xs text-slate-500">NOI</div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: accentColor }}
                    >
                      $142K
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
