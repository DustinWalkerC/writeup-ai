'use client'

import { useState } from 'react'
import { COLOR_PRESETS, ColorPresetKey, getContrastColor } from '@/lib/branding'

type Props = {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPicker({ value, onChange, label }: Props) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(COLOR_PRESETS) as ColorPresetKey[]).map((key) => {
          const preset = COLOR_PRESETS[key]
          const isSelected = value === preset.primary
          return (
            <button
              key={key}
              onClick={() => onChange(preset.primary)}
              className={`
                group relative w-10 h-10 rounded-lg transition-all
                ${isSelected ? 'ring-2 ring-offset-2 ring-cyan-500 scale-110' : 'hover:scale-105'}
              `}
              style={{ backgroundColor: preset.primary }}
              title={preset.name}
            >
              {isSelected && (
                <span 
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: getContrastColor(preset.primary) }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
        
        {/* Custom Color Button */}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`
            w-10 h-10 rounded-lg border-2 border-dashed transition-all
            ${showCustom 
              ? 'border-cyan-500 bg-cyan-50' 
              : 'border-slate-300 hover:border-slate-400'
            }
          `}
          title="Custom color"
        >
          <span className="text-slate-400 text-lg">+</span>
        </button>
      </div>

      {/* Custom Color Input */}
      {showCustom && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                onChange(e.target.value)
              }
            }}
            placeholder="#000000"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
          />
        </div>
      )}

      {/* Preview Bar */}
      <div 
        className="h-2 rounded-full"
        style={{ backgroundColor: value }}
      />
    </div>
  )
}
