// lib/branding.ts

/**
 * CORE — Brand Color System
 *
 * Updated to support 3 user-selectable colors:
 *   accent_color        → Report primary (headers, bars)
 *   secondary_color     → Report secondary (backgrounds, alt rows)
 *   report_accent_color → Report accent (highlights, trend lines) — NEW
 */

export type BrandColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  background: string;
  border: string;
};

/**
 * Generate a complete color palette from a single accent color.
 * Used for the Settings preview and derived colors.
 */
export function generateColorPalette(accentColor: string): BrandColors {
  const hsl = hexToHSL(accentColor);

  return {
    primary: accentColor,
    primaryLight: hslToHex({ ...hsl, l: Math.min(hsl.l + 40, 95) }),
    primaryDark: hslToHex({ ...hsl, l: Math.max(hsl.l - 15, 10) }),
    secondary: hslToHex({ ...hsl, s: Math.max(hsl.s - 30, 10), l: 45 }),
    accent: hslToHex({ h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l }),
    text: '#1e293b',
    textMuted: '#64748b',
    background: '#ffffff',
    border: '#e2e8f0',
  };
}

/**
 * Preset color schemes — now with 3 colors each.
 * Clicking a preset sets primary, secondary, AND accent at once.
 */
export type ColorPreset = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
};

export const COLOR_PRESETS: Record<string, ColorPreset> = {
  charcoalSapphire: {
    name: 'Charcoal & Sapphire',
    primary: '#27272A',
    secondary: '#EFF6FF',
    accent: '#2563EB',
  },
  navyGold: {
    name: 'Navy & Gold',
    primary: '#1B2A4A',
    secondary: '#FEF9E7',
    accent: '#C9A84C',
  },
  navyCrimson: {
    name: 'Executive Navy & Crimson',
    primary: '#002D5F',
    secondary: '#F8FAFC',
    accent: '#CC0000',
  },
  slateEmerald: {
    name: 'Slate & Emerald',
    primary: '#334155',
    secondary: '#F0FDF4',
    accent: '#059669',
  },
  professional: {
    name: 'Professional Blue',
    primary: '#162e4b',
    secondary: '#EFF6FF',
    accent: '#3B82F6',
  },
  modern: {
    name: 'Modern Teal',
    primary: '#0F766E',
    secondary: '#F0FDFA',
    accent: '#14B8A6',
  },
  corporate: {
    name: 'Corporate Navy',
    primary: '#1E3A5F',
    secondary: '#F8FAFC',
    accent: '#2563EB',
  },
  elegant: {
    name: 'Elegant Charcoal',
    primary: '#18181B',
    secondary: '#FAFAFA',
    accent: '#6366F1',
  },
  vibrant: {
    name: 'Vibrant Cyan',
    primary: '#0E7490',
    secondary: '#ECFEFF',
    accent: '#06B6D4',
  },
};

export type ColorPresetKey = keyof typeof COLOR_PRESETS;

/**
 * Default brand colors (Charcoal & Sapphire)
 */
export const DEFAULT_BRAND_COLORS = {
  primary: '#27272A',
  secondary: '#EFF6FF',
  accent: '#2563EB',
};

// ── Color utility functions ──

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function isLightColor(hex: string): boolean {
  const { l } = hexToHSL(hex);
  return l > 50;
}

export function getContrastColor(hex: string): string {
  return isLightColor(hex) ? '#1e293b' : '#ffffff';
}
