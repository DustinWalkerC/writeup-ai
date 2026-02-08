'use client'

import { useState } from 'react'
import { createOrUpdateSettings } from '@/app/actions/settings'
import { UserSettings } from '@/lib/supabase'

type Props = {
  initialSettings: UserSettings | null
}

export function SettingsForm({ initialSettings }: Props) {
  const [companyName, setCompanyName] = useState(initialSettings?.company_name || '')
  const [accentColor, setAccentColor] = useState(initialSettings?.accent_color || '#0f172a')
  const [aiTone, setAiTone] = useState(initialSettings?.ai_tone || 'balanced')
  const [disclaimer, setDisclaimer] = useState(
    initialSettings?.custom_disclaimer ||
      'Confidential – For Investor Use Only. This report contains proprietary information and is intended solely for the use of the intended recipient(s).'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setSaved(false)

    const result = await createOrUpdateSettings({
      company_name: companyName,
      accent_color: accentColor,
      ai_tone: aiTone as 'conservative' | 'balanced' | 'optimistic',
      custom_disclaimer: disclaimer,
    })

    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert(result.error || 'Failed to save')
    }

    setIsSaving(false)
  }

  const colorPresets = [
    { name: 'Navy', value: '#0f172a' },
    { name: 'Blue', value: '#1e40af' },
    { name: 'Teal', value: '#0f766e' },
    { name: 'Green', value: '#166534' },
    { name: 'Purple', value: '#6b21a8' },
    { name: 'Slate', value: '#475569' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company Information */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Capital Partners"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
            />
            <p className="text-sm text-slate-500 mt-1">This will appear in report headers and footers.</p>
          </div>
        </div>
      </section>

      {/* Report Branding */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Branding</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setAccentColor(preset.value)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      accentColor === preset.value ? 'border-slate-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>

              <input
                type="color"
                value={accentColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />

              <span className="text-sm text-slate-500">{accentColor}</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Preferences */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Tone</h2>

        <div className="space-y-3">
          {[
            { value: 'conservative', label: 'Conservative', description: 'Cautious language, emphasizes risks, understated positives' },
            { value: 'balanced', label: 'Balanced', description: 'Professional neutral tone, presents facts objectively' },
            { value: 'optimistic', label: 'Optimistic', description: 'Highlights positives, forward-looking, confident tone' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                aiTone === option.value ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="aiTone"
                value={option.value}
                checked={aiTone === option.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAiTone(e.target.value as 'conservative' | 'balanced' | 'optimistic')
                }
                className="mt-1"
              />
              <div>
                <div className="font-medium text-slate-900">{option.label}</div>
                <div className="text-sm text-slate-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Disclaimer</h2>

        <div>
          <textarea
            value={disclaimer}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDisclaimer(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none resize-none"
          />
          <p className="text-sm text-slate-500 mt-1">This text appears at the bottom of every report.</p>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saved && <span className="text-green-600 text-sm">Settings saved</span>}
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
