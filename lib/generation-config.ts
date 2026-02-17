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
 * │  Token limits too low?  → TIER_CONFIG.maxTokens  │
 * │  Wrong model?           → MODEL_CONFIG            │
 * │  Sections too long?     → SECTION_LENGTH          │
 * │  Charts missing?        → CHART_ACCESS            │
 * │  Temperature too high?  → MODEL_CONFIG.temperature│
 * └─────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════
// MODEL CONFIGURATION
// ═══════════════════════════════════════════════════════════

/**
 * Model strings — update these when new models release.
 * The env vars override these defaults (for A/B testing).
 */
export const MODELS = {
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  OPUS_4_5: 'claude-opus-4-5-20250929',
  OPUS_4_6: 'claude-opus-4-6',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Model selection per call type × tier.
 * Env vars (CLAUDE_MODEL_EXTRACTION, CLAUDE_MODEL_NARRATIVE)
 * override these when set. These are the defaults.
 */
export const MODEL_CONFIG = {
  extraction: {
    foundational:  { model: MODELS.SONNET_4_5, temperature: 0 },
    professional:  { model: MODELS.SONNET_4_5, temperature: 0 },
    institutional: { model: MODELS.SONNET_4_5, temperature: 0 },
  },
  narrative: {
    foundational:  { model: MODELS.SONNET_4_5, temperature: 0.15 },
    professional:  { model: MODELS.SONNET_4_5, temperature: 0.2 },
    institutional: { model: MODELS.SONNET_4_5, temperature: 0.25 },
    // To upgrade institutional to Opus:
    // institutional: { model: MODELS.OPUS_4_5, temperature: 0.25 },
  },
} as const;

// ═══════════════════════════════════════════════════════════
// TOKEN LIMITS
// ═══════════════════════════════════════════════════════════

/**
 * Max output tokens per API call.
 *
 * CORE pipeline has separate limits for extraction and narrative.
 * Legacy pipeline uses a single combined limit.
 *
 * If reports are truncating → increase narrative maxTokens.
 * If extraction is missing data → increase extraction maxTokens.
 */
export const TOKEN_LIMITS = {
  core: {
    extraction: {
      foundational:  2500,
      professional:  4000,
      institutional: 6000,
    },
    narrative: {
      foundational:  8000,
      professional:  20000,
      institutional: 30000,
    },
  },
  legacy: {
    foundational:  6000,
    professional:  16000,
    institutional: 24000,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION LENGTH CONTROLS
// ═══════════════════════════════════════════════════════════

/**
 * Controls narrative length per section per tier.
 *
 * sentenceRange: [min, max] sentences for the narrative paragraph(s)
 * maxParagraphs: maximum number of paragraphs in the section
 *
 * These values are injected into the narrative prompt so Claude
 * knows exactly how long each section should be.
 *
 * Making sections too short? → increase sentenceRange max.
 * Sections rambling? → decrease sentenceRange max and maxParagraphs.
 */
export const SECTION_LENGTH = {
  foundational: {
    default:              { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    executive_summary:    { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    revenue_summary:      { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    expense_summary:      { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    asset_manager_outlook:{ sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
  },
  professional: {
    default:              { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    executive_summary:    { sentenceRange: [3, 4] as [number, number], maxParagraphs: 1 },
    revenue_summary:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    expense_summary:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    revenue_analysis:     { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    expense_analysis:     { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    occupancy_leasing:    { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    noi_performance:      { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    rent_roll_insights:   { sentenceRange: [2, 4] as [number, number], maxParagraphs: 1 },
    risk_watch_items:     { sentenceRange: [2, 3] as [number, number], maxParagraphs: 1 },
    market_positioning:   { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    capital_improvements: { sentenceRange: [2, 4] as [number, number], maxParagraphs: 1 },
    asset_manager_outlook:{ sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
  },
  institutional: {
    default:                       { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    executive_summary:             { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    revenue_summary:               { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    expense_summary:               { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    revenue_analysis:              { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    expense_analysis:              { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    occupancy_leasing:             { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    noi_performance:               { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    rent_roll_insights:            { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    risk_watch_items:              { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    market_positioning:            { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    capital_improvements:          { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    asset_manager_outlook:         { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    investment_thesis_update:      { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    lease_expiration_rollover:     { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    rent_roll_deep_dive:           { sentenceRange: [4, 6] as [number, number], maxParagraphs: 2 },
    budget_vs_actual:              { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    market_submarket_analysis:     { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    capital_improvements_tracker:  { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    risk_matrix:                   { sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
    resident_operational_metrics:  { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    regulatory_compliance:         { sentenceRange: [3, 5] as [number, number], maxParagraphs: 2 },
    asset_manager_strategic_outlook:{ sentenceRange: [4, 7] as [number, number], maxParagraphs: 3 },
  },
} as const;

// ═══════════════════════════════════════════════════════════
// CHART / TEMPLATE ACCESS PER TIER
// ═══════════════════════════════════════════════════════════

/**
 * Which chart templates each tier can use.
 * Foundational = KPI cards only (no visual charts).
 * Professional = all standard charts.
 * Institutional = all charts including comparison tables.
 */
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

/**
 * Which chart template(s) to use per section.
 * Claude references this to decide what chart to generate.
 */
export const SECTION_CHART_MAP: Record<string, string[]> = {
  executive_summary:             [],
  revenue_summary:               ['budget_variance_table'],
  expense_summary:               ['budget_variance_table'],
  revenue_analysis:              ['revenue_waterfall'],
  expense_analysis:              ['expense_horizontal_bars'],
  occupancy_leasing:             ['occupancy_gauge', 'move_in_out_bars'],
  noi_performance:               ['noi_trend_bars'],
  rent_roll_insights:            ['rent_roll_table'],
  rent_roll_deep_dive:           ['rent_roll_table'],
  risk_watch_items:              ['risk_cards'],
  risk_matrix:                   ['risk_cards'],
  budget_vs_actual:              ['budget_variance_table'],
  market_positioning:            ['comparison_table'],
  market_submarket_analysis:     ['comparison_table'],
  capital_improvements:          [],
  capital_improvements_tracker:  [],
  investment_thesis_update:      [],
  lease_expiration_rollover:     ['comparison_table'],
  asset_manager_outlook:         [],
  asset_manager_strategic_outlook:[],
  resident_operational_metrics:  ['comparison_table'],
  regulatory_compliance:         [],
};

// ═══════════════════════════════════════════════════════════
// TIER CONFIGURATION (aggregate)
// ═══════════════════════════════════════════════════════════

/**
 * Complete tier configuration — combines everything above.
 * This is the main export used by report-generator.ts.
 */
export const TIER_CONFIG = {
  foundational: {
    maxSections: 4,
    monthlyPrice: 75,
    label: 'Foundational',
  },
  professional: {
    maxSections: 10,
    monthlyPrice: 250,
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

type Tier = 'foundational' | 'professional' | 'institutional';

/**
 * Get the complete model config for a specific call type + tier.
 * Env vars override the defaults from MODEL_CONFIG.
 */
export function getModelConfig(tier: string, callType: 'extraction' | 'narrative') {
  const t = (tier as Tier) || 'foundational';

  if (callType === 'extraction') {
    const config = MODEL_CONFIG.extraction[t] || MODEL_CONFIG.extraction.foundational;
    const tokens = TOKEN_LIMITS.core.extraction[t] || TOKEN_LIMITS.core.extraction.foundational;
    return {
      model: process.env.CLAUDE_MODEL_EXTRACTION || process.env.CLAUDE_MODEL || config.model,
      temperature: config.temperature,
      maxTokens: tokens,
    };
  }

  const config = MODEL_CONFIG.narrative[t] || MODEL_CONFIG.narrative.foundational;
  const tokens = TOKEN_LIMITS.core.narrative[t] || TOKEN_LIMITS.core.narrative.foundational;
  return {
    model: process.env.CLAUDE_MODEL_NARRATIVE || process.env.CLAUDE_MODEL || config.model,
    temperature: config.temperature,
    maxTokens: tokens,
  };
}

/**
 * Get legacy (single-call) token limit for a tier.
 */
export function getLegacyMaxTokens(tier: string): number {
  const t = (tier as Tier) || 'foundational';
  return TOKEN_LIMITS.legacy[t] || TOKEN_LIMITS.legacy.foundational;
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
  const recommended = SECTION_CHART_MAP[sectionId] || ['kpi_strip'];
  return recommended.filter(chart => available.includes(chart));
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
  const rules = sectionIds.map(id => {
    const instruction = buildSectionLengthInstruction(id, tier);
    return `  <section id="${id}">${instruction}</section>`;
  }).join('\n');

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
  const lines = sectionIds.map(id => {
    const charts = getChartsForSection(id, tier);
    return `  <section id="${id}">${charts.join(', ')}</section>`;
  }).join('\n');

  return `<chart_access>
For each section, use ONLY the chart templates listed below.
If a section shows "kpi_strip" only, do NOT generate any other chart type.
${lines}
</chart_access>`;
}
