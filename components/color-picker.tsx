'use client';

import { useState, useEffect } from 'react';
import { COLOR_PRESETS, ColorPresetKey, getContrastColor } from '@/lib/branding';

type Props = {
  value: string;
  secondaryValue?: string;
  onChange: (color: string) => void;
  onSecondaryChange?: (color: string) => void;
  label?: string;
};

export function ColorPicker({ value, secondaryValue, onChange, onSecondaryChange, label }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState(value);
  const [customSwatches, setCustomSwatches] = useState<string[]>(() => {
    // If the current value isn't a preset, seed it as a custom swatch
    const isPreset = (Object.keys(COLOR_PRESETS) as ColorPresetKey[]).some(
      (k) => COLOR_PRESETS[k].primary === value
    );
    return isPreset ? [] : value ? [value] : [];
  });

  // Keep customInput in sync when value changes externally
  useEffect(() => {
    setCustomInput(value);
  }, [value]);

  const handlePresetSelect = (key: ColorPresetKey) => {
    const preset = COLOR_PRESETS[key];
    onChange(preset.primary);
    if (onSecondaryChange) {
      onSecondaryChange(preset.secondary);
    }
    setShowCustomInput(false);
  };

  const handleCustomSwatchSelect = (color: string) => {
    onChange(color);
    setCustomInput(color);
    setShowCustomInput(false);
  };

  const handleCustomColorConfirm = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(customInput)) return;

    // Add to custom swatches if not already there and not a preset
    const isPreset = (Object.keys(COLOR_PRESETS) as ColorPresetKey[]).some(
      (k) => COLOR_PRESETS[k].primary === customInput
    );
    if (!isPreset && !customSwatches.includes(customInput)) {
      setCustomSwatches((prev) => [...prev, customInput]);
    }

    onChange(customInput);
    setShowCustomInput(false);
  };

  const handleCustomInputChange = (input: string) => {
    setCustomInput(input);
    // Live-apply when valid
    if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
      onChange(input);
    }
  };

  const handleColorPickerChange = (hex: string) => {
    setCustomInput(hex);
    onChange(hex);
  };

  const handleRemoveCustomSwatch = (color: string) => {
    setCustomSwatches((prev) => prev.filter((c) => c !== color));
    // If the removed swatch was selected, fall back to first preset
    if (value === color) {
      const firstPresetKey = Object.keys(COLOR_PRESETS)[0] as ColorPresetKey;
      handlePresetSelect(firstPresetKey);
    }
  };

  // Check if current value matches any preset
  const matchedPreset = (Object.keys(COLOR_PRESETS) as ColorPresetKey[]).find(
    (k) => COLOR_PRESETS[k].primary === value
  );
  const isCustomSelected = !matchedPreset;

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      {/* Color Swatches */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500">Choose a preset or create a custom color</p>
        <div className="flex flex-wrap gap-2">
          {/* Preset swatches */}
          {(Object.keys(COLOR_PRESETS) as ColorPresetKey[]).map((key) => {
            const preset = COLOR_PRESETS[key];
            const isSelected = value === preset.primary;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetSelect(key)}
                className={`
                  relative w-10 h-10 rounded-lg transition-all flex-shrink-0
                  ${isSelected ? 'ring-2 ring-offset-2 ring-cyan-500 scale-110' : 'hover:scale-105'}
                `}
                style={{ backgroundColor: preset.primary }}
                title={preset.name}
              >
                {isSelected && (
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ color: getContrastColor(preset.primary) }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom swatches */}
          {customSwatches.map((color) => {
            const isSelected = value === color;
            return (
              <div key={color} className="relative group">
                <button
                  type="button"
                  onClick={() => handleCustomSwatchSelect(color)}
                  className={`
                    relative w-10 h-10 rounded-lg transition-all flex-shrink-0
                    ${isSelected ? 'ring-2 ring-offset-2 ring-cyan-500 scale-110' : 'hover:scale-105'}
                  `}
                  style={{ backgroundColor: color }}
                  title={`Custom: ${color}`}
                >
                  {isSelected && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ color: getContrastColor(color) }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
                {/* Remove button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCustomSwatch(color);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove custom color"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Add custom color button */}
          <button
            type="button"
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`
              w-10 h-10 rounded-lg border-2 border-dashed transition-all flex items-center justify-center flex-shrink-0
              ${showCustomInput
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-slate-300 hover:border-slate-400'
              }
            `}
            title="Add custom color"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Custom Color Input Panel */}
      {showCustomInput && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customInput}
              onChange={(e) => handleColorPickerChange(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              onBlur={() => {
                if (!/^#[0-9A-Fa-f]{6}$/.test(customInput)) {
                  setCustomInput(value);
                }
              }}
              placeholder="#27272A"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            />
            <button
              type="button"
              onClick={handleCustomColorConfirm}
              disabled={!/^#[0-9A-Fa-f]{6}$/.test(customInput)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Add
            </button>
          </div>
          {/* Live preview of custom color */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-slate-200"
              style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customInput) ? customInput : '#cccccc' }}
            />
            <span className="text-xs text-slate-500">
              {/^#[0-9A-Fa-f]{6}$/.test(customInput)
                ? 'Click "Add" to save this as a swatch'
                : 'Enter a valid hex color (e.g. #2563EB)'}
            </span>
          </div>
        </div>
      )}

      {/* Current Color Preview Bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: value }} />
        {secondaryValue && (
          <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: secondaryValue }} />
        )}
      </div>

      {/* Selected label */}
      <p className="text-xs text-slate-500">
        {matchedPreset
          ? `Selected: ${COLOR_PRESETS[matchedPreset].name}`
          : `Custom: ${value}`}
      </p>
    </div>
  );
}
