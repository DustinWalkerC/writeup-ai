// lib/branding.ts

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
 * Generate a complete color palette from a single accent color
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
 * Preset color schemes for report branding
 * Each preset has a primary (dark) and secondary (light) color, plus a display name.
 */
export const COLOR_PRESETS = {
  charcoalSapphire: {
    name: 'Charcoal & Sapphire',
    primary: '#27272A',
    secondary: '#EFF6FF',
  },
  navyGold: {
    name: 'Navy & Gold',
    primary: '#1B2A4A',
    secondary: '#FEF9E7',
  },
  slateEmerald: {
    name: 'Slate & Emerald',
    primary: '#334155',
    secondary: '#ECFDF5',
  },
  professional: {
    name: 'Professional Blue',
    primary: '#162e4b',
    secondary: '#e9ebf2',
  },
  modern: {
    name: 'Modern Teal',
    primary: '#0d9488',
    secondary: '#f0fdfa',
  },
  corporate: {
    name: 'Corporate Navy',
    primary: '#1e3a5f',
    secondary: '#f8fafc',
  },
  elegant: {
    name: 'Elegant Charcoal',
    primary: '#374151',
    secondary: '#f9fafb',
  },
  vibrant: {
    name: 'Vibrant Cyan',
    primary: '#0891b2',
    secondary: '#ecfeff',
  },
} as const;

export type ColorPresetKey = keyof typeof COLOR_PRESETS;

/**
 * Default brand colors (Charcoal & Sapphire)
 */
export const DEFAULT_BRAND_COLORS = {
  primary: '#27272A',
  secondary: '#EFF6FF',
  accent: '#2563EB',
};

/**
 * Convert hex to HSL
 */
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

/**
 * Convert HSL to hex
 */
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

/**
 * Check if color is light or dark
 */
export function isLightColor(hex: string): boolean {
  const { l } = hexToHSL(hex);
  return l > 50;
}

/**
 * Get contrasting text color for a background
 */
export function getContrastColor(hex: string): string {
  return isLightColor(hex) ? '#1e293b' : '#ffffff';
}
