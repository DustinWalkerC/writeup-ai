// lib/generation-config.ts

/**
 * CORE — Centralized Generation Configuration
 *
 * ONE FILE to control everything about report generation.
 * Change token limits, models, temperatures, section lengths,
 * and chart access here — no hunting through other files.
 *
 * ┌─────────────────────────────────────────────────┐
 * │  QUICK REFERENCE                                 │
 * │                                                   │
 * │  Token limits too low?  → TOKEN_LIMITS / DB ai_config │
 * │  Wrong model?           → MODELS / DB ai_config       │
 * │  Sections too long?     → SECTION_LENGTH              │
 * │  Charts missing?        → CHART_ACCESS                │
 * │  Temperature too high?  → MODEL_CONFIG.temperature    │
 * └─────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────┐
 * │  PHASE 1 CHANGES (from Master Architecture)      │
 * │                                                   │
 * │  • Opus 4.5 for Institutional narrative           │
 * │  • Temperature 0.3 for all narrative tiers        │
 * │  • Token limits aligned to architecture doc       │
 * │  • system_config table support (Phase 4 wiring)   │
 * └─────────────────────────────────────────────────┘
 */

import { supabaseAdmin as supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════
// DB-DRIVEN SYSTEM CONFIG (WITH HARD FALLBACKS)
// ═══════════════════════════════════════════════════════════

// Hardcoded fallbacks (used if DB read fails)
const FALLBACK_MODELS = {
  extraction: {
    foundational: 'claude-sonnet-4-5-20250929',
    professional: 'claude-sonnet-4-5-20250929',
    institutional: 'claude-sonnet-4-5-20250929',
  },
  narrative: {
    foundational: 'claude-sonnet-4-5-20250929',
    professional: 'claude-sonnet-4-5-20250929',
    institutional: 'claude-opus-4-5-20250918',
  },
} as const;

const FALLBACK_TOKEN_LIMITS = {
  extraction: { foundational: 4096, professional: 4096, institutional: 8192 },
  narrative: { foundational: 12000, professional: 20000, institutional: 32000 },
} as const;

let cachedConfig: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getSystemConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) return cachedConfig;

  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ai_config')
      .single();

    if (data?.value) {
      cachedConfig = data.value;
      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch {
    // Fall through to defaults
  }
  return null;
}

type Tier = 'foundational' | 'professional' | 'institutional';

export async function getModel(callType: 'extraction' | 'narrative', tier: string): Promise<string> {
  const config = await getSystemConfig();
  const t = (tier as Tier) || 'foundational';
  return (
    config?.models?.[callType]?.[t] ||
    FALLBACK_MODELS[callType][t as keyof typeof FALLBACK_MODELS['extraction']] ||
    'claude-sonnet-4-5-20250929'
  );
}

export async function getTokenLimit(callType: 'extraction' | 'narrative', tier: string): Promise<number> {
  const config = await getSystemConfig();
  const t = (tier as Tier) || 'foundational';
  return (
    config?.token_limits?.[callType]?.[t] ||
    FALLBACK_TOKEN_LIMITS[callType][t as keyof typeof FALLBACK_TOKEN_LIMITS['extraction']] ||
    12000
  );
}

export async function isFeatureEnabled(feature: 'validation_enabled' | 'charts_enabled'): Promise<boolean> {
  const config = await getSystemConfig();
  return config?.features?.[feature] !== false; // Default to true
}

export async function getConcurrentLimit(): Promise<number> {
  const config = await getSystemConfig();
  return config?.features?.concurrent_limit || 3;
}

// ═══════════════════════════════════════════════════════════
// MODEL CONFIGURATION (STATIC DEFAULTS — STILL USED FOR TEMPERATURE)
// ═══════════════════════════════════════════════════════════

/**
 * Model strings — update these when new models release.
 * NOTE: Primary model selection is now DB-driven via getModel().
 * These are retained for:
 *  - temperature defaults
 *  - legacy/env override fallback behavior
 */
export const MODELS = {
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  OPUS_4_5: 'claude-opus-4-5-20250929',
  OPUS_4_6: 'claude-opus-4-6',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Temperature selection per call type × tier.
 * Extraction always 0 (deterministic parsing).
 * Narrative default 0.3 for all tiers.
 */
export const MODEL_CONFIG = {
  extraction: {
    foundational: { model: MODELS.SONNET_4_5, temperature: 0 },
    professional: { model: MODELS.SONNET_4_5, temperature: 0 },
    institutional: { model: MODELS.SONNET_4_5, temperature: 0 },
  },
  narrative: {
    foundational: { model: MODELS.SONNET_4_5, temperature: 0.3 },
    professional: { model: MODELS.SONNET_4_5, temperature: 0.3 },
    institutional: { model: MODELS.OPUS_4_5, temperature: 0.3 },
  },
} as const;

// ═══════════════════════════════════════════════════════════
// TOKEN LIMITS (STATIC DEFAULTS — DB OVERRIDES VIA getTokenLimit())
// ═══════════════════════════════════════════════════════════

/**
 * Max output tokens per API call.
 *
 * NOTE: Primary limits are now DB-driven via getTokenLimit().
 * These remain as documentation + legacy defaults.
 */
export const TOKEN_LIMITS = {
  core: {
    extraction: {
      foundational: 2500,
      professional: 4000,
      institutional: 6000,
    },
    narrative: {
      foundational: 6000,
      professional: 16000,
      institutional: 24000,
    },
  },
  legacy: {
    foundational: 6000,
    professional: 16000,
    institutional: 24000,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION LENGTH CONTROLS
// ═══════════════════════════════════════════════════════════

export const SECTION_LENGTH = {
  foundational: {
    default:               { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    executive_summary:     { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    revenue_summary:       { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    expense_summary:       { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    asset_manager_outlook: { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
  },
  professional: {
    default:               { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    executive_summary:     { sentenceRange: [3, 4] as [number, number], maxParagraphs: 1 },
    revenue_summary:       { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    expense_summary:       { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    revenue_analysis:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    expense_analysis:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    occupancy_leasing:     { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    noi_performance:       { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    rent_roll_insights:    { sentenceRange: [2, 4] as [number, number], maxParagraphs: 1 },
    risk_watch_items:      { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    market_positioning:    { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    capital_improvements:  { sentenceRange: [2, 4] as [number, number], maxParagraphs: 1 },
    asset_manager_outlook: { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
  },
  institutional: {
    default:                        { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    executive_summary:              { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    revenue_summary:                { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    expense_summary:                { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    revenue_analysis:               { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    expense_analysis:               { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    occupancy_leasing:              { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    noi_performance:                { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    rent_roll_insights:             { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    risk_watch_items:               { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    market_positioning:             { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    capital_improvements:           { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    asset_manager_outlook:          { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    investment_thesis_update:       { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    lease_expiration_rollover:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    rent_roll_deep_dive:            { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    budget_vs_actual:               { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    market_submarket_analysis:      { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    capital_improvements_tracker:   { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    risk_matrix:                    { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    resident_operational_metrics:   { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    regulatory_compliance:          { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    asset_manager_strategic_outlook:{ sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
  },
} as const;

// ═══════════════════════════════════════════════════════════
// CHART / TEMPLATE ACCESS PER TIER
// ═══════════════════════════════════════════════════════════

export const CHART_ACCESS = {
  foundational: [] as const,
  professional: [
    'budget_variance_table',
    'revenue_waterfall',
    'expense_horizontal_bars',
    'occupancy_gauge',
    'noi_trend_bars',
    'rent_roll_table',
    'risk_cards',
    'move_in_out_bars',
  ] as const,
  institutional: [
    'budget_variance_table',
    'revenue_waterfall',
    'expense_horizontal_bars',
    'occupancy_gauge',
    'noi_trend_bars',
    'rent_roll_table',
    'risk_cards',
    'move_in_out_bars',
    'comparison_table',
  ] as const,
} as const;

export const SECTION_CHART_MAP: Record<string, string[]> = {
  executive_summary:              [],
  revenue_summary:                ['budget_variance_table'],
  expense_summary:                ['budget_variance_table'],
  revenue_analysis:               ['revenue_waterfall'],
  expense_analysis:               ['expense_horizontal_bars'],
  occupancy_leasing:              ['occupancy_gauge', 'move_in_out_bars'],
  noi_performance:                ['noi_trend_bars'],
  rent_roll_insights:             ['rent_roll_table'],
  rent_roll_deep_dive:            ['rent_roll_table'],
  risk_watch_items:               ['risk_cards'],
  risk_matrix:                    ['risk_cards'],
  budget_vs_actual:               ['budget_variance_table'],
  market_positioning:             ['comparison_table'],
  market_submarket_analysis:      ['comparison_table'],
  capital_improvements:           [],
  capital_improvements_tracker:   [],
  investment_thesis_update:       [],
  lease_expiration_rollover:      ['comparison_table'],
  asset_manager_outlook:          [],
  asset_manager_strategic_outlook:[],
  resident_operational_metrics:   ['comparison_table'],
  regulatory_compliance:          [],
};

// ═══════════════════════════════════════════════════════════
// TIER CONFIGURATION (aggregate)
// ═══════════════════════════════════════════════════════════

export const TIER_CONFIG = {
  foundational: {
    maxSections: 4,
    monthlyPrice: 75,
    label: 'Foundational',
  },
  professional: {
    maxSections: 10,
    monthlyPrice: 299,
    label: 'Professional',
  },
  institutional: {
    maxSections: 15,
    monthlyPrice: 750,
    label: 'Institutional',
  },
} as const;

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get the complete model config for a specific call type + tier.
 *
 * SYNCHRONOUS — uses MODEL_CONFIG static values + env overrides + cached DB config.
 * No await needed. Safe to call as: const config = getModelConfig(tier, 'extraction')
 *
 * For DB-driven model/token overrides, call warmConfigCache() once at startup
 * so cachedConfig is populated before the first generation.
 */
export function getModelConfig(tier: string, callType: 'extraction' | 'narrative'): {
  model: string;
  maxTokens: number;
  temperature: number;
} {
  const t = (tier as Tier) || 'foundational';

  if (callType === 'extraction') {
    const staticConfig = MODEL_CONFIG.extraction[t] || MODEL_CONFIG.extraction.foundational;

    // Model: env override → DB cache → static fallback
    const model =
      process.env.CLAUDE_MODEL_EXTRACTION ||
      process.env.CLAUDE_MODEL ||
      cachedConfig?.models?.extraction?.[t] ||
      FALLBACK_MODELS.extraction[t as keyof typeof FALLBACK_MODELS.extraction] ||
      staticConfig.model;

    // Tokens: DB cache → static fallback
    const maxTokens =
      cachedConfig?.token_limits?.extraction?.[t] ||
      FALLBACK_TOKEN_LIMITS.extraction[t as keyof typeof FALLBACK_TOKEN_LIMITS.extraction] ||
      TOKEN_LIMITS.core.extraction[t as keyof typeof TOKEN_LIMITS.core.extraction] ||
      4096;

    return { model, temperature: staticConfig.temperature, maxTokens };
  }

  // narrative
  const staticConfig = MODEL_CONFIG.narrative[t] || MODEL_CONFIG.narrative.foundational;

  const model =
    process.env.CLAUDE_MODEL_NARRATIVE ||
    process.env.CLAUDE_MODEL ||
    cachedConfig?.models?.narrative?.[t] ||
    FALLBACK_MODELS.narrative[t as keyof typeof FALLBACK_MODELS.narrative] ||
    staticConfig.model;

  const maxTokens =
    cachedConfig?.token_limits?.narrative?.[t] ||
    FALLBACK_TOKEN_LIMITS.narrative[t as keyof typeof FALLBACK_TOKEN_LIMITS.narrative] ||
    TOKEN_LIMITS.core.narrative[t as keyof typeof TOKEN_LIMITS.core.narrative] ||
    12000;

  return { model, temperature: staticConfig.temperature, maxTokens };
}

/**
 * Get legacy (single-call) token limit for a tier.
 * NOTE: Still uses static legacy limits (unchanged) unless you want to DB-drive it too.
 */
export function getLegacyMaxTokens(tier: string): number {
  const t = (tier as Tier) || 'foundational';
  return TOKEN_LIMITS.legacy[t] || TOKEN_LIMITS.legacy.foundational;
}

/**
 * Pre-warm the DB config cache.
 * Call once at app startup so getModelConfig() (sync) has DB values available.
 * Optional — without this, getModelConfig uses static fallbacks until
 * the first async getModel/getTokenLimit call populates the cache.
 */
export async function warmConfigCache(): Promise<void> {
  await getSystemConfig();
}

/**
 * Force-refresh the cached config.
 * Call after admin saves new config.
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Get section length config for a specific section + tier.
 * Falls back to the tier's default if the section isn't listed.
 */
export function getSectionLength(sectionId: string, tier: string): { sentenceRange: [number, number]; maxParagraphs: number } {
  const t = (tier as Tier) || 'foundational';
  const tierConfig = SECTION_LENGTH[t] || SECTION_LENGTH.foundational;
  const sectionConfig = (tierConfig as Record<string, { sentenceRange: [number, number]; maxParagraphs: number }>)[sectionId];
  return sectionConfig || tierConfig.default;
}

/**
 * Get the list of chart templates available for a tier.
 */
export function getAvailableCharts(tier: string): readonly string[] {
  const t = (tier as Tier) || 'foundational';
  return CHART_ACCESS[t] || CHART_ACCESS.foundational;
}

/**
 * Get the recommended chart templates for a specific section,
 * filtered by what the tier has access to.
 */
export function getChartsForSection(sectionId: string, tier: string): string[] {
  const available = getAvailableCharts(tier);
  const recommended = SECTION_CHART_MAP[sectionId] || [];
  return recommended.filter((chart) => available.includes(chart));
}

/**
 * Build the section length instruction string for injection into prompts.
 * Returns something like: "Write 3-5 sentences across 1-2 paragraphs."
 */
export function buildSectionLengthInstruction(sectionId: string, tier: string): string {
  const { sentenceRange, maxParagraphs } = getSectionLength(sectionId, tier);
  const [min, max] = sentenceRange;

  if (maxParagraphs === 1) {
    return `Write ${min}–${max} sentences in a single paragraph.`;
  }
  return `Write ${min}–${max} sentences across 1–${maxParagraphs} paragraphs.`;
}

/**
 * Build the full <section_length_rules> XML block for the narrative prompt.
 * This gives Claude explicit length instructions for every section.
 */
export function buildSectionLengthRulesBlock(sectionIds: string[], tier: string): string {
  const rules = sectionIds
    .map((id) => {
      const instruction = buildSectionLengthInstruction(id, tier);
      return `  <section id="${id}">${instruction}</section>`;
    })
    .join('\n');

  return `<section_length_rules>
Each section's narrative must follow these length constraints exactly.
Do not exceed the maximum sentences or paragraphs for any section.
Charts and tables do NOT count toward the sentence limit — only narrative text does.
${rules}
</section_length_rules>`;
}

/**
 * Build the <chart_access> XML block for the narrative prompt.
 * Tells Claude which templates it can use for each section.
 */
export function buildChartAccessBlock(sectionIds: string[], tier: string): string {
  const lines = sectionIds
    .map((id) => {
      const charts = getChartsForSection(id, tier);
      if (charts.length === 0) return `  <section id="${id}">none (KPI metrics only)</section>`;
      return `  <section id="${id}">${charts.join(', ')}</section>`;
    })
    .join('\n');

  return `<chart_access>
For each section, use ONLY the chart templates listed below.
If a section shows "none", do NOT generate chart_html — only populate the "metrics" array.
${lines}
</chart_access>`;
}
