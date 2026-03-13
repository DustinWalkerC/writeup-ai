// lib/prompt-templates.ts

/**
 * PHASE 1 — Master System Prompt Architecture
 * PHASE 5 — Chart Data Migration (Option 2)
 *
 * Phase 5 changes:
 * - buildChartAccessBlock() now includes strict JSON schemas for chart_data
 * - Output schema tells Claude to set chart_html to "" and populate chart_data
 * - Tier config blocks updated to reference chart_data
 * - Backend fills chart_html from chart_data using chart-template-filler.ts
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  SYSTEM PROMPT STRUCTURE                                     │
 * │                                                              │
 * │  CACHED BLOCKS (1–8)  ~2,500 tokens — identical every call   │
 * │    1. <role>                                                 │
 * │    2. <audience>                                             │
 * │    3. <writing_standards>                                    │
 * │    4. <financial_terminology>                                │
 * │    5. <analytical_framework>                                 │
 * │    6. <data_integrity_rules>                                 │
 * │    7. <math_validation_rules>         ← Phase 1              │
 * │    8. <output_schema>                 ← UPDATED Phase 5      │
 * │                                                              │
 * │  PER-REQUEST BLOCKS (9–15) — change per report               │
 * │    9.  <user_preferences>                                    │
 * │   10.  <property_context>                                    │
 * │   11.  <brand_colors>                                        │
 * │   12.  <historical_data>                                     │
 * │   13.  <budget_context>                                      │
 * │   14.  <sections_to_generate>                                │
 * │   15.  <tier_config>                  ← UPDATED Phase 5      │
 * │                                                              │
 * │  + Section guidance definitions (cached)                     │
 * │  + Visualization templates (cached)                          │
 * │  + Section length rules (per-request)                        │
 * │  + Chart data schemas (per-request)   ← NEW Phase 5          │
 * └──────────────────────────────────────────────────────────────┘
 */

import { SectionDefinition } from './section-definitions';
import { buildVisualizationTemplatesBlock } from './chart-templates/index';
import { buildSectionLengthRulesBlock } from './generation-config';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ═══════════════════════════════════════════════════════════
// AI PREFERENCES TYPE
// ═══════════════════════════════════════════════════════════

export interface AIPreferences {
  writing_tone?: 'formal' | 'professional' | 'direct';
  analysis_depth?: 'summary' | 'standard' | 'comprehensive';
  terminology?: 'standard_cre' | 'institutional_pe';
  variance_threshold?: number;
  negative_format?: 'parenthetical' | 'dash';
  include_forward_outlook?: boolean;
  risk_severity_labels?: 'monitor_action' | 'low_med_high';
  cross_section_insights?: boolean;
}

// ═══════════════════════════════════════════════════════════
// USER PREFERENCES XML BLOCK (EXPORT)
// ═══════════════════════════════════════════════════════════

export function buildUserPreferencesBlock(prefs: {
  writing_tone?: string;
  analysis_depth?: string;
  terminology_level?: string;
  variance_threshold?: number;
  negative_format?: string;
  risk_severity_labels?: string;
  cross_section_insights?: boolean;
  include_forward_outlook?: boolean;
}): string {
  return `<user_preferences>
  <writing_tone>${prefs.writing_tone || 'professional'}</writing_tone>
  <analysis_depth>${prefs.analysis_depth || 'standard'}</analysis_depth>
  <terminology_level>${prefs.terminology_level || 'standard_cre'}</terminology_level>
  <variance_threshold>${prefs.variance_threshold || 5}%</variance_threshold>
  <negative_format>${prefs.negative_format || 'parenthetical'}</negative_format>
  <risk_severity_labels>${prefs.risk_severity_labels || 'monitor_action'}</risk_severity_labels>
  <cross_section_insights>${prefs.cross_section_insights ? 'enabled' : 'disabled'}</cross_section_insights>
  <include_forward_outlook>${prefs.include_forward_outlook !== false ? 'yes' : 'no'}</include_forward_outlook>
</user_preferences>`;
}

// ═══════════════════════════════════════════════════════════
// CHART DATA SCHEMAS — Phase 5
// Claude outputs chart_data JSON matching these exact schemas.
// The backend fills chart_html from chart_data using template filler.
// ═══════════════════════════════════════════════════════════

export function buildChartAccessBlock(sectionIds: string[], tier: string): string {
  // Foundational tier: no charts at all
  if (tier === 'foundational') {
    return `<chart_output_rules>
This is a Foundational tier report. Do NOT generate any charts.
Set "chart_html" to "" (empty string) and "chart_data" to null for all sections.
Only populate the "metrics" array for KPI cards.
</chart_output_rules>`;
  }

  // Professional and Institutional tiers: output chart_data JSON
  return `<chart_output_rules>
IMPORTANT — PHASE 5 CHART DATA MIGRATION:

You do NOT generate chart HTML. Instead, output structured JSON in the "chart_data" field.
The backend renders charts from chart_data using pre-built templates.

For EVERY section that has a chart assignment below, you MUST:
1. Set "chart_html" to "" (empty string) — the backend fills this from chart_data
2. Set "chart_data" to a JSON object matching the EXACT schema for that chart type
3. Use the EXACT field names shown — do NOT rename fields or add extra fields

For sections with NO chart assignment, set both "chart_html" to "" and "chart_data" to null.

NOTE: The report viewer renders the property header, date, and KPI bar
automatically from report metadata. Do NOT generate a report_header chart.
For executive_summary, set chart_data to null and use the "metrics" array for KPIs.

═══════════════════════════════════════════
CHART DATA SCHEMAS (use EXACTLY as shown):
═══════════════════════════════════════════

SCHEMA: budget_variance_table
{
  "chart_type": "budget_variance_table",
  "title": "string — e.g. 'Budget vs. Actual — Operating Expenses'",
  "subtitle": "string — e.g. 'November 2025 · Favorable variance in green'",
  "data": {
    "rows": [
      {
        "category": "string — e.g. 'Property Taxes'",
        "actual": number — integer dollars,
        "budget": number — integer dollars,
        "is_expense": true|false — true for expense tables (under-budget = favorable)
      }
    ],
    "totals": {
      "label": "string — e.g. 'Total OpEx'",
      "actual": number,
      "budget": number,
      "is_expense": true|false
    }
  }
}

SCHEMA: revenue_waterfall
{
  "chart_type": "revenue_waterfall",
  "title": "string — e.g. 'P&L Waterfall — Revenue to NOI'",
  "subtitle": "string — e.g. 'November 2025'",
  "data": {
    "bars": [
      {
        "label": "string — e.g. 'Revenue'",
        "value": number — positive for totals/additions, negative for deductions,
        "type": "total|deduction|addition|result"
      }
    ]
  }
}
First bar should be type "total" (Revenue). Last bar should be type "result" (NOI).
Middle bars are "deduction" (expenses, vacancy) or "addition" (other income).

SCHEMA: expense_horizontal_bars
{
  "chart_type": "expense_horizontal_bars",
  "title": "string — e.g. 'Expense Breakdown by Category'",
  "subtitle": "string — e.g. 'Actual vs. Budget · November 2025'",
  "data": {
    "categories": [
      {
        "label": "string — e.g. 'Property Taxes'",
        "actual": number — integer dollars,
        "budget": number|null — integer dollars, null if no budget
      }
    ]
  }
}

SCHEMA: occupancy_gauge
{
  "chart_type": "occupancy_gauge",
  "data": {
    "physical": { "value": number — e.g. 91.4, "change_bps": number|null — e.g. -90 },
    "economic": { "value": number — e.g. 80.0, "change_bps": number|null } | null
  }
}
Set economic to null if economic occupancy data is not available.

SCHEMA: noi_trend_bars
{
  "chart_type": "noi_trend_bars",
  "title": "string — e.g. 'NOI — Trailing 6 Months'",
  "data": {
    "months": [
      {
        "label": "string — e.g. 'Jun'",
        "noi": number — integer dollars,
        "beat_budget": true|false|null — null if no budget data
      }
    ]
  }
}
Include 3-6 trailing months from the T-12 data. Current month last.

SCHEMA: rent_roll_table
{
  "chart_type": "rent_roll_table",
  "title": "string — e.g. 'Unit Mix Summary'",
  "subtitle": "string — e.g. 'By floorplan'",
  "data": {
    "rows": [
      {
        "floorplan": "string — e.g. '1BR / 1BA'",
        "units": number,
        "avg_rent": number|null,
        "avg_sqft": number|null,
        "rent_per_sqft": number|null,
        "occupancy_pct": number|null
      }
    ],
    "totals": {
      "units": number,
      "avg_rent": number|null,
      "avg_sqft": number|null,
      "rent_per_sqft": number|null,
      "occupancy_pct": number|null
    }
  }
}

SCHEMA: risk_cards
{
  "chart_type": "risk_cards",
  "data": {
    "items": [
      {
        "title": "string — e.g. 'Rising Vacancy Loss'",
        "severity": "high|medium|low",
        "description": "string — 1-2 sentences explaining the risk"
      }
    ]
  }
}
Generate 2-4 risk items based on data anomalies, trends, and budget misses.

SCHEMA: move_in_out_bars
{
  "chart_type": "move_in_out_bars",
  "title": "string — e.g. 'Leasing Activity'",
  "data": {
    "move_ins": number,
    "move_outs": number,
    "renewals": number|null,
    "notices_to_vacate": number|null,
    "avg_new_lease": number|null — monthly rent,
    "avg_renewal": number|null — monthly rent
  }
}

SCHEMA: comparison_table
{
  "chart_type": "comparison_table",
  "title": "string",
  "subtitle": "string",
  "data": {
    "headers": ["string", "string", ...],
    "rows": [
      {
        "values": ["string|number", ...] — one value per header,
        "is_total": true|false — optional, bold + top border,
        "highlight": true|false — optional
      }
    ]
  }
}

═══════════════════════════════════════
SECTION → CHART TYPE ASSIGNMENTS:
═══════════════════════════════════════
executive_summary → NO CHART (the viewer renders the header; put KPIs in "metrics" array, set chart_data to null)
revenue_summary → budget_variance_table
expense_summary → budget_variance_table
revenue_analysis → revenue_waterfall
expense_analysis → expense_horizontal_bars
occupancy_leasing → occupancy_gauge AND move_in_out_bars (output the gauge as chart_data, move_in_out as a second chart — use occupancy_gauge for chart_data)
noi_performance → noi_trend_bars
rent_roll_insights → rent_roll_table
rent_roll_deep_dive → rent_roll_table
risk_watch_items → risk_cards
risk_matrix → risk_cards
budget_vs_actual → budget_variance_table
market_positioning → comparison_table
market_submarket_analysis → comparison_table
lease_expiration_rollover → comparison_table
resident_operational_metrics → comparison_table
All other sections → no chart (chart_data: null)

If a section has NO data for its assigned chart, set chart_data to null.
</chart_output_rules>`;
}

// ═══════════════════════════════════════════════════════════
// CACHED BLOCKS 1–8
// Identical across all requests. ~2,500 tokens.
// Cache reads cost 90% less than fresh input.
// ═══════════════════════════════════════════════════════════

function buildCachedSystemBlocks(): string {

  // ── Block 1: <role> ──
  const block1 = `<role>
You are a senior multifamily real estate analyst at an institutional
private equity firm. You produce investor reports for LPs, institutional
investors, and sophisticated capital partners. Your analysis is
number-forward, direct, and actionable. You write like a VP of Asset
Management at JLL or CBRE — not a marketing department.
</role>`;

  // ── Block 2: <audience> ──
  const block2 = `<audience>
Limited partners, institutional investors, family offices, and
sophisticated capital partners. These readers manage large portfolios.
They want clear data, honest assessment, and forward-looking insight.
They do not want filler, marketing language, or vague optimism.
</audience>`;

  // ── Block 3: <writing_standards> ──
  const block3 = `<writing_standards>
- Analytical, direct, concise. Every sentence adds information.
- Number-forward: lead with metrics, then context.
- No marketing tone. No emojis. No exclamation marks.
- No filler phrases: "It is worth noting", "Interestingly",
  "It should be noted", "Moving forward", "Going forward".
- Vary sentence structure. Mix short declarative statements with
  longer analytical sentences. Avoid starting consecutive sentences
  with the same word.
- Use active voice. "Revenue increased 4.2%" not "An increase of
  4.2% was observed in revenue."
- Paragraphs should flow logically: metric → context → driver →
  implication.
- Bold key takeaway phrases throughout the narrative using <strong> tags so
  an LP can skim just the bold text and understand the full story.
  Example: "NOI of <strong>$113,848 (+25.8% MoM)</strong> driven by
  <strong>$26,671 in operating expense reduction</strong>."
  Bold 2-4 phrases per paragraph — metrics, drivers, and conclusions.
  The bold text alone should form a coherent summary.
- Every sentence in the executive summary must contain a specific number.
- FORBIDDEN WORDS — never use these:
  "significant/significantly" — use specific quantifiers
  "notable/noteworthy" — just state the fact
  "it is worth noting" — delete, state directly
  "robust/solid" — use specific descriptors
  "going forward" — use "in the coming months" or omit
  "leverage" (as verb) — use "use"
  "utilize" — use "use"
</writing_standards>`;

  // ── Block 4: <financial_terminology> ──
  const block4 = `<financial_terminology>
Use these terms correctly and consistently:
- GPR: Gross Potential Rent — maximum rent if 100% occupied at market rates
- EGI: Effective Gross Income — collected revenue after vacancy, concessions, bad debt
- NRI: Net Rental Income — rental income minus vacancy and concessions
- NOI: Net Operating Income — Total Revenue minus Total Operating Expenses
- LTL: Loss to Lease — difference between market rent and in-place rent
- Basis points (bps): 1bp = 0.01%. Use for precise changes under 1%.
- MoM: Month-over-month comparison
- YoY: Year-over-year comparison
- Per-unit metrics: Always calculate as total ÷ unit count when referencing per-unit values
The audience understands RE jargon. Do not define these terms.
</financial_terminology>`;

  // ── Block 5: <analytical_framework> ──
  const block5 = `<analytical_framework>
EXECUTIVE SUMMARY:
- 2–3 sentences (Foundational), 3–4 sentences (Professional/Institutional)
- Sentence 1: Headline NOI figure with MoM change
- Sentence 2: Key driver (what caused the change)
- Sentence 3+: Forward-looking risk or opportunity

SECTION NARRATIVE:
- Lead every section with the headline number, not a setup sentence.
  GOOD: "Hill at Woodway generated $113,848 in NOI, a 25.8% improvement over October..."
  BAD: "In November 2025, the property continued to demonstrate strong performance..."
- Contextualize every metric: compare to prior month, budget, or trailing average.
- For variance analysis: state actual, state benchmark, state delta (both $ and %).

ASSET MANAGER OUTLOOK:
- Use the asset manager's questionnaire answers and freeform notes.
- Write in third person: "The asset management team reports..."
- If no notes provided, write 2 sentences based on the financial data.
</analytical_framework>`;

  // ── Block 6: <data_integrity_rules> ──
  const block6 = `<data_integrity_rules>
- NOI CEILING: Your analysis STOPS at Net Operating Income.
  NOI = Total Revenue - Total Operating Expenses.
  Never reference debt service, capital expenditures, or cash flow
  below the NOI line unless the user explicitly provides this data
  in the questionnaire.
- DATA FIDELITY: Only reference numbers that exist in the provided
  data. Never fabricate, estimate, or round numbers that were given
  precisely.
- MONTH ALIGNMENT: Only analyze the report month specified. Do not
  reference months outside the provided data range.
- NUMBER FORMATTING: Use $X,XXX for dollars. Use X.X% for
  percentages. Use (parentheses) or dash for negatives based on
  user preference.
- VACANCY vs OCCUPANCY: Always verify which metric the source data
  reports. Convert correctly. 91.4% occupancy = 8.6% vacancy.
</data_integrity_rules>`;

  // ── Block 7: <math_validation_rules> ──
  const block7 = `<math_validation_rules>
Every derived metric in your report MUST include a calculations entry.
For each calculation, provide:
{
  "metric_name": "Net Operating Income",
  "inputs": {
    "total_revenue": 277826,
    "total_operating_expenses": 163978
  },
  "formula": "total_revenue - total_operating_expenses",
  "ai_result": 113848
}

Rules:
- Input values must exactly match the source data provided.
- Formula must be a valid arithmetic expression using the input keys.
- ai_result must be the result of evaluating the formula.
- Include calculations for: NOI, EGI, margins, ratios, MoM changes,
  budget variances (both $ and %), per-unit metrics, and any other
  derived values referenced in the narrative.
- Do NOT include calculations for raw source values (these are
  verified at extraction, not generation).
</math_validation_rules>`;

  // ── Block 8: <output_schema> ── UPDATED Phase 5
  const block8 = `<output_schema>
Return a single JSON object with this structure:
{
  "report_header": {
    "property_name": "string",
    "report_month": "string",
    "prepared_for": "string",
    "prepared_by": "string"
  },
  "analysis_summary": "One paragraph executive synopsis",
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative text (plain text with <strong> for emphasis and <br/> for line breaks). No HTML charts, no styled divs.",
      "chart_html": "",
      "chart_data": {
        "chart_type": "report_header | budget_variance_table | revenue_waterfall | expense_horizontal_bars | occupancy_gauge | noi_trend_bars | rent_roll_table | risk_cards | move_in_out_bars | comparison_table",
        "title": "Chart Title (if applicable)",
        "data": { }
      },
      "metrics": [
        {
          "label": "Net Operating Income",
          "value": "$113,848",
          "change": "+4.2%",
          "changeDirection": "up",
          "vsbudget": "+2.1%"
        }
      ],
      "calculations": [
        {
          "metric_name": "string",
          "inputs": { "key": "number" },
          "formula": "string",
          "ai_result": "number"
        }
      ],
      "included": true,
      "skipReason": null
    }
  ]
}

CRITICAL FIELD SEPARATION:
- "content" = NARRATIVE TEXT ONLY. No <div>, <table>, <svg>, or styled HTML.
  Allowed tags: <strong>, <em>, <br/>, <p>. Nothing else.
- "chart_html" = ALWAYS set to "" (empty string). The backend fills this
  from chart_data using pre-built templates. Do NOT generate chart HTML.
- "chart_data" = Structured JSON matching the chart type schema from
  <chart_output_rules>. The backend uses this to render the chart.
  Set to null if the section has no chart assignment.
- "metrics" = KPI data for the compact metric strip rendered by the viewer.
  Do NOT generate kpi_strip HTML — the viewer handles metric cards automatically.
- "calculations" = Every derived metric must have an entry here for math validation.
  Raw source values do not need entries — only computed values.

CRITICAL SECTION ORDER:
- The "sections" array MUST preserve the EXACT order from <sections_to_generate>.
- Do NOT rearrange, reorder, or sort sections by any other criteria.

CRITICAL: Return ONLY valid JSON. No markdown fences. No preamble.
The response will be parsed by JSON.parse() directly.
</output_schema>`;

  return [block1, block2, block3, block4, block5, block6, block7, block8].join('\n\n');
}

// ═══════════════════════════════════════════════════════════
// PER-REQUEST BLOCK BUILDERS (9–15)
// Each returns an XML string or null (omit if no data).
// ═══════════════════════════════════════════════════════════

/**
 * Block 9: <user_preferences>
 * Built from user_settings.ai_preferences JSONB.
 * Controls writing style per the user's saved preferences.
 * Returns null if no preferences set (uses defaults from writing_standards).
 */
function buildUserPreferencesBlockOrNull(prefs?: AIPreferences | null): string | null {
  if (!prefs) return null;

  // Map legacy/internal AIPreferences -> exported XML prefs shape
  return buildUserPreferencesBlock({
    writing_tone: prefs.writing_tone,
    analysis_depth: prefs.analysis_depth,
    terminology_level: prefs.terminology,
    variance_threshold: prefs.variance_threshold,
    negative_format: prefs.negative_format,
    risk_severity_labels: prefs.risk_severity_labels,
    cross_section_insights: prefs.cross_section_insights,
    include_forward_outlook: prefs.include_forward_outlook,
  });
}

/**
 * Block 10: <property_context>
 * Property details for this specific report.
 */
function buildPropertyContextBlock(params: {
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
}): string {
  return `<property_context>
property_name: ${params.propertyName}
${params.propertyAddress ? `address: ${params.propertyAddress}` : ''}
${params.unitCount ? `units: ${params.unitCount}` : ''}
${params.investmentStrategy ? `investment_strategy: "${params.investmentStrategy}"` : ''}
</property_context>`;
}

/**
 * Block 11: <brand_colors>
 * Per-report brand colors for chart template token replacement.
 */
function buildBrandColorsBlock(colors?: {
  primary: string;
  secondary: string;
  accent: string;
}): string {
  const c = colors || { primary: '#27272A', secondary: '#EFF6FF', accent: '#2563EB' };
  return `<brand_colors>
PRIMARY=${c.primary}
SECONDARY=${c.secondary}
ACCENT=${c.accent}
GREEN=#059669
RED=#DC2626
AMBER=#D97706
</brand_colors>`;
}

/**
 * Block 12: <historical_data>
 * Prior month KPI metrics from previous completed report.
 * Returns null if no prior report exists.
 */
function buildHistoricalDataBlock(historicalContext?: string | null): string | null {
  if (!historicalContext) return null;
  return `<historical_data>
${historicalContext}
</historical_data>`;
}

/**
 * Block 13: <budget_context>
 * Budget summary matched to report month.
 * Returns null if no budget data is available.
 */
function buildBudgetContextBlock(budget?: {
  budget_month?: string;
  budget_total_revenue?: number;
  budget_total_expenses?: number;
  budget_noi?: number;
} | null): string | null {
  if (!budget || (!budget.budget_total_revenue && !budget.budget_total_expenses)) return null;
  const lines: string[] = [];
  if (budget.budget_month) lines.push(`budget_month: ${budget.budget_month}`);
  if (budget.budget_total_revenue) lines.push(`budget_total_revenue: ${budget.budget_total_revenue}`);
  if (budget.budget_total_expenses) lines.push(`budget_total_expenses: ${budget.budget_total_expenses}`);
  if (budget.budget_noi) lines.push(`budget_noi: ${budget.budget_noi}`);
  return `<budget_context>
${lines.join('\n')}
</budget_context>`;
}

/**
 * Block 14: <sections_to_generate>
 * Intersection of tier pool + user toggles from designer tab.
 * Includes paragraph count per section.
 */
function buildSectionsToGenerateBlock(
  sections: SectionDefinition[],
  sectionsToSkip: string[],
  paragraphCounts?: Record<string, number>
): { active: SectionDefinition[]; skipped: SectionDefinition[]; block: string } {
  const active = sections.filter(s => !sectionsToSkip.includes(s.id));
  const skipped = sections.filter(s => sectionsToSkip.includes(s.id));

  let block = `<sections_to_generate>
CRITICAL — SECTION ORDER IS MANDATORY:
The user has configured a specific section layout. You MUST output the "sections" array in EXACTLY this order.
Do NOT reorder sections based on your own judgment of logical flow.
The order below is intentional and reflects the user's business preference.
Section order="1" MUST be index 0 in the response array, order="2" MUST be index 1, etc.
Violating section order is a critical error.\n\n`;

  for (let i = 0; i < active.length; i++) {
    const section = active[i];
    const paragraphs = paragraphCounts?.[section.id] || undefined;
    block += `<section order="${i + 1}" id="${section.id}" title="${section.title}"${paragraphs ? ` paragraphs="${paragraphs}"` : ''}>
Refer to section_guidance id="${section.id}" in the system prompt for analysis instructions.${paragraphs ? `\nWRITE EXACTLY ${paragraphs} PARAGRAPHS for this section. This is a hard requirement from the user's settings.` : ''}
</section>\n\n`;
  }
  block += `</sections_to_generate>`;

  return { active, skipped, block };
}

/**
 * Block 15: <tier_config>
 * Appended last. Controls depth, section count, and chart access.
 * UPDATED Phase 5: references chart_data instead of chart_html.
 */
function buildTierConfigBlock(tier: string): string {
  if (tier === 'foundational') {
    return `<tier_config>
<tier>foundational</tier>
<instructions>
Concise 4-section report. KPI metric cards only — no charts.
Keep narrative brief: 2–4 paragraphs per section. Focus on headline numbers.
Do not generate chart_html. Leave chart_html as empty string "".
Do not generate chart_data. Set chart_data to null.
</instructions>
</tier_config>`;
  }

  if (tier === 'professional') {
    return `<tier_config>
<tier>professional</tier>
<instructions>
Polished 10-section report. 3–6 paragraphs per section.
Balance narrative with visual data presentation.
Charts: output structured JSON in "chart_data" matching the schemas in <chart_output_rules>.
Set "chart_html" to "" (empty string) — the backend renders charts from chart_data.
Do NOT generate any HTML for charts. Only output the data as JSON.
Every derived metric must have a "calculations" entry for math validation.
</instructions>
</tier_config>`;
  }

  // institutional
  return `<tier_config>
<tier>institutional</tier>
<instructions>
Comprehensive institutional-grade report with up to 15 sections and premium visualizations.
Think CBRE/JLL investor memo quality. Dense with data, every word earns its place.
4–8 paragraphs per section. Multiple chart types per section where appropriate.
Charts: output structured JSON in "chart_data" matching the schemas in <chart_output_rules>.
Set "chart_html" to "" (empty string) — the backend renders charts from chart_data.
Do NOT generate any HTML for charts. Only output the data as JSON.
Every derived metric must have a "calculations" entry for math validation.
Cross-reference data between sections for coherent narrative arc.
</instructions>
</tier_config>`;
}

// ═══════════════════════════════════════════════════════════
// CALL 1 — DATA EXTRACTION PROMPTS
// (Unchanged from current — extraction architecture is solid)
// ═══════════════════════════════════════════════════════════

export function buildExtractionSystemPrompt(params: {
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  selectedMonth: number;
  selectedYear: number;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  return `<role>
You are a financial data extraction engine for multifamily real estate operating statements.
Parse uploaded financial documents and extract every relevant number into the exact JSON schema below.
Do not generate narrative text, HTML, charts, or analysis. Return ONLY the JSON object.
</role>

<property_context>
Property: ${params.propertyName}
${params.propertyAddress ? `Address: ${params.propertyAddress}` : ''}
${params.unitCount ? `Units: ${params.unitCount}` : ''}
Report Month: ${monthName} ${params.selectedYear}
</property_context>

<extraction_rules>
- Extract the CURRENT MONTH column (${monthName} or ${params.selectedMonth}/${params.selectedYear}) as "current" values
- Extract the PRIOR MONTH column (one column to the left of current) as "prior" values
- Extract the BUDGET column if present as "budget" values
- Extract trailing 12 months of NOI, Revenue, Expenses, and Occupancy if available in the T-12
- For the rent roll: extract unit mix summary grouped by floorplan with average rents, sqft, and occupancy
- For leasing activity: extract move-ins, move-outs, renewals, and notices to vacate counts
- All dollar values as integers with no cents: 113848 not 113848.00 or 113,848
- All percentages as numbers with one decimal: 91.4 not 0.914 or "91.4%"
- If a value cannot be found in the documents, use null — NEVER guess or fabricate numbers
- STOP AT NOI. Do not extract debt service, loan payments, capex, distributions, or any below-the-line items
- If the documents contain below-NOI items, IGNORE them completely
</extraction_rules>

<output_schema>
Respond with ONLY a JSON object matching this exact structure. No markdown fences, no preamble.
Your response must start with { and end with }.

{
  "property": {
    "name": "string",
    "units": number|null,
    "month": "string",
    "year": number
  },
  "income": {
    "gross_potential_rent": { "current": number|null, "prior": number|null, "budget": number|null },
    "vacancy_loss": { "current": number|null, "prior": number|null, "budget": number|null },
    "loss_to_lease": { "current": number|null, "prior": number|null, "budget": number|null },
    "concessions": { "current": number|null, "prior": number|null, "budget": number|null },
    "bad_debt": { "current": number|null, "prior": number|null, "budget": number|null },
    "net_rental_income": { "current": number|null, "prior": number|null, "budget": number|null },
    "other_income": { "current": number|null, "prior": number|null, "budget": number|null },
    "total_revenue": { "current": number|null, "prior": number|null, "budget": number|null }
  },
  "expenses": {
    "categories": [
      { "name": "string", "current": number|null, "prior": number|null, "budget": number|null }
    ],
    "total_expenses": { "current": number|null, "prior": number|null, "budget": number|null }
  },
  "noi": { "current": number|null, "prior": number|null, "budget": number|null },
  "occupancy": {
    "physical_percent": number|null,
    "economic_percent": number|null,
    "units_occupied": number|null,
    "units_vacant": number|null,
    "units_on_notice": number|null,
    "units_preleased": number|null
  },
  "leasing_activity": {
    "move_ins": number|null,
    "move_outs": number|null,
    "renewals": number|null,
    "notices_to_vacate": number|null,
    "new_lease_avg_rent": number|null,
    "renewal_avg_rent": number|null
  },
  "rent_roll": {
    "unit_mix": [
      { "floorplan": "string", "unit_count": number, "avg_rent": number|null, "avg_sqft": number|null, "avg_rent_per_sqft": number|null, "occupancy_pct": number|null }
    ],
    "total_units": number|null,
    "avg_rent": number|null
  },
  "trailing_12": {
    "months": ["string"],
    "noi": [number|null],
    "revenue": [number|null],
    "expenses": [number|null],
    "occupancy": [number|null]
  },
  "data_quality": {
    "t12_found": boolean,
    "rent_roll_found": boolean,
    "leasing_found": boolean,
    "budget_found": boolean,
    "month_match_confirmed": boolean,
    "notes": ["string"]
  }
}
</output_schema>`;
}

export function buildExtractionUserPrompt(params: {
  fileContents: Record<string, string>;
  selectedMonth: number;
  selectedYear: number;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `<uploaded_documents>\n`;

  if (params.fileContents.t12) {
    prompt += `<t12_operating_statement>\n${params.fileContents.t12}\n</t12_operating_statement>\n\n`;
  } else {
    prompt += `<t12_operating_statement>NOT PROVIDED</t12_operating_statement>\n\n`;
  }

  if (params.fileContents.rent_roll) {
    prompt += `<rent_roll>\n${params.fileContents.rent_roll}\n</rent_roll>\n\n`;
  }

  if (params.fileContents.leasing_activity) {
    prompt += `<leasing_activity>\n${params.fileContents.leasing_activity}\n</leasing_activity>\n\n`;
  }

  if (params.fileContents.budget) {
    prompt += `<annual_budget>\n${params.fileContents.budget}\n</annual_budget>\n\n`;
  }

  const additionalKeys = Object.keys(params.fileContents).filter(
    k => !['t12', 'rent_roll', 'leasing_activity', 'budget'].includes(k)
  );
  for (const key of additionalKeys) {
    prompt += `<additional_document type="${key}">\n${params.fileContents[key]}\n</additional_document>\n\n`;
  }

  prompt += `</uploaded_documents>\n\n`;
  prompt += `Extract all financial data for ${monthName} ${params.selectedYear} into the JSON schema specified in the system prompt. Return ONLY the JSON object.`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// CALL 2 — NARRATIVE + CHART ASSEMBLY PROMPTS
// ═══════════════════════════════════════════════════════════

export function buildNarrativeSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  historicalContext?: string;
  companyName?: string;
  logoUrl?: string;
  sections: SectionDefinition[];
  // ── Phase 1 additions (all optional for backward compat) ──
  aiPreferences?: AIPreferences | null;
  brandColors?: { primary: string; secondary: string; accent: string };
  budgetSummary?: {
    budget_month?: string;
    budget_total_revenue?: number;
    budget_total_expenses?: number;
    budget_noi?: number;
  } | null;
  sectionParagraphCounts?: Record<string, number>;
}): string {

  // ── Cached blocks 1–8 (identical every call) ──
  const cachedBlocks = buildCachedSystemBlocks();

  // ── Per-request blocks 9–15 ──
  const perRequestBlocks: string[] = [];

  // Block 9: User preferences
  const prefsBlock = buildUserPreferencesBlockOrNull(params.aiPreferences);
  if (prefsBlock) perRequestBlocks.push(prefsBlock);

  // Block 10: Property context
  perRequestBlocks.push(buildPropertyContextBlock({
    propertyName: params.propertyName,
    propertyAddress: params.propertyAddress,
    unitCount: params.unitCount,
    investmentStrategy: params.investmentStrategy,
  }));

  // Block 11: Brand colors
  perRequestBlocks.push(buildBrandColorsBlock(params.brandColors));

  // Block 12: Historical data
  const histBlock = buildHistoricalDataBlock(params.historicalContext);
  if (histBlock) perRequestBlocks.push(histBlock);

  // Block 13: Budget context
  const budgetBlock = buildBudgetContextBlock(params.budgetSummary);
  if (budgetBlock) perRequestBlocks.push(budgetBlock);

  // Block 15: Tier config (before sections for context)
  perRequestBlocks.push(buildTierConfigBlock(params.tier));

  // ── Section guidance definitions (cached — same for all users) ──
  const sectionGuidance = params.sections.map(s =>
    `<section_guidance id="${s.id}" title="${s.title}" conditional="${s.isConditional}" visualizations="${s.visualizations}">
${s.promptGuidance}
</section_guidance>`
  ).join('\n\n');

  // ── Visualization templates (cached — kept for reference/context) ──
  const vizTemplates = buildVisualizationTemplatesBlock();

  // ── Section length + chart access rules (per-request, tier-specific) ──
  const sectionIds = params.sections.map(s => s.id);
  const lengthRules = buildSectionLengthRulesBlock(sectionIds, params.tier);
  const chartAccess = buildChartAccessBlock(sectionIds, params.tier);

  // ── Report header instruction ──
  // NOTE: The viewer renders the header automatically from report metadata.
  // We pass company/logo info for the narrative to reference, NOT for chart generation.
  let reportHeaderBlock = '';
  if (params.companyName || params.logoUrl) {
    reportHeaderBlock = `<report_context>
${params.companyName ? `Company name: ${params.companyName}` : ''}
${params.logoUrl ? `Logo URL: ${params.logoUrl}` : ''}
Use the company name in the report_header JSON field (top-level, not in sections).
Do NOT generate a report_header chart_data for executive_summary — the viewer handles the visual header.
</report_context>`;
  }

  // ── Critical rules (enforcement layer) ──
  const criticalRules = `<critical_rules>
<rule>Do NOT generate a report_header chart for the executive_summary section. The report viewer renders the property header, date, and top-level KPI bar automatically from report metadata. Setting chart_data to the report_header schema would create a duplicate header. For executive_summary, set chart_data to null and put KPI values in the "metrics" array instead.</rule>
<rule>Use exact numbers from the <extracted_data> in the user prompt. Never round unless source is rounded.</rule>
<rule>Format: $1,234,567 (commas) | 94.5% (one decimal) | $850/unit | +3.2% or –1.5% (show sign)</rule>
<rule>If a number seems inconsistent, flag it in the narrative.</rule>
<rule>Never fabricate data. Missing data = "included": false with skipReason.</rule>
<rule>Use RE terminology naturally: NOI, GPR, EGI, NER, loss-to-lease, etc.</rule>
<rule>Set chart_html to "" (empty string) for ALL sections. The backend fills this from chart_data.</rule>
<rule>Every derived metric referenced in narrative MUST have a matching entry in "calculations".</rule>
</critical_rules>`;

  // ── Assemble complete system prompt ──
  return [
    cachedBlocks,
    '\n\n',
    perRequestBlocks.join('\n\n'),
    '\n\n',
    `<section_definitions>\n${sectionGuidance}\n</section_definitions>`,
    '\n\n',
    vizTemplates,
    '\n\n',
    reportHeaderBlock,
    '\n\n',
    lengthRules,
    '\n\n',
    chartAccess,
    '\n\n',
    criticalRules,
  ].filter(s => s.trim()).join('\n');
}

export function buildNarrativeUserPrompt(params: {
  extractedDataJson: string;
  sections: SectionDefinition[];
  sectionsToSkip: string[];
  selectedMonth: number;
  selectedYear: number;
  questionnaireAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  freeformNarrative?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  // ── Phase 1 additions ──
  sectionParagraphCounts?: Record<string, number>;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\n`;

  // ── Brand colors (kept in user prompt for backward compat if provided) ──
  if (params.brandColors) {
    prompt += `<brand_colors>
PRIMARY=${params.brandColors.primary}
SECONDARY=${params.brandColors.secondary}
ACCENT=${params.brandColors.accent}
GREEN=#059669
RED=#DC2626
AMBER=#D97706
</brand_colors>\n\n`;
  }

  // ── Extracted data from Call 1 ──
  prompt += `<extracted_data>\n${params.extractedDataJson}\n</extracted_data>\n\n`;

  // ── Asset manager notes ──
  const answeredQuestions = Object.entries(params.questionnaireAnswers).filter(([_, v]) => v?.trim());
  if (answeredQuestions.length > 0 || params.freeformNarrative) {
    prompt += `<asset_manager_notes>\n`;
    for (const [key, value] of answeredQuestions) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      prompt += `<note category="${key}">${label}: ${value}</note>\n`;
    }
    if (params.freeformNarrative) {
      prompt += `<freeform>${params.freeformNarrative}</freeform>\n`;
    }
    prompt += `</asset_manager_notes>\n\n`;
  }

  if (params.distributionStatus && params.distributionStatus !== 'none') {
    prompt += `<distribution_status>
<status>${params.distributionStatus}</status>
${params.distributionNote ? `<note>${params.distributionNote}</note>` : ''}
</distribution_status>\n\n`;
  }

  // ── Block 14: Sections to generate — EXPLICITLY NUMBERED ──
  const { active: activeSections, skipped: skippedSections, block: sectionsBlock } =
    buildSectionsToGenerateBlock(
      params.sections,
      params.sectionsToSkip,
      params.sectionParagraphCounts
    );

  prompt += sectionsBlock + '\n\n';

  // Pre-skipped sections
  if (skippedSections.length > 0) {
    prompt += `<pre_skipped_sections>
These sections were skipped due to missing data. Include them AFTER all active sections with "included": false.
${skippedSections.map(s => `- ${s.id}: "${s.title}"`).join('\n')}
</pre_skipped_sections>\n\n`;
  }

  // ── Final instructions ──
  prompt += `<final_instructions>
<instruction>Use the data from <extracted_data> — do not re-read original documents.</instruction>
<instruction>Set chart_html to "" (empty string) for ALL sections. Output chart data as JSON in chart_data.</instruction>
<instruction>Return a SINGLE JSON with ALL ${params.sections.length} sections (${activeSections.length} active + ${skippedSections.length} skipped).</instruction>
<instruction>STOP AT NOI. No debt service, capex, or distributions unless the asset manager mentioned them.</instruction>
<instruction>The "sections" array MUST match the EXACT order from <sections_to_generate>.</instruction>
<instruction>Every derived metric in the narrative MUST have a corresponding entry in that section's "calculations" array.</instruction>
</final_instructions>`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// SECTION REGENERATION PROMPT
// ═══════════════════════════════════════════════════════════

export function buildSectionRegeneratePrompt(params: {
  sectionId: string;
  sectionTitle: string;
  currentContent: string;
  userNotes: string;
  sectionGuidance: string;
}): string {
  return `<task>Regenerate ONLY the "${params.sectionTitle}" section based on user feedback.</task>

<current_content>
${params.currentContent}
</current_content>

<user_feedback>
${params.userNotes}
</user_feedback>

<section_guidelines>
${params.sectionGuidance}
</section_guidelines>

<output_format>
Respond with ONLY a JSON object. No markdown fences, no preamble.
{
  "id": "${params.sectionId}",
  "title": "${params.sectionTitle}",
  "content": "Narrative text only — no HTML charts.",
  "chart_html": "",
  "chart_data": null,
  "metrics": [...],
  "calculations": [...],
  "included": true,
  "skipReason": null
}
</output_format>`;
}

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPAT — Legacy single-call aliases
// Used by the legacy pipeline (when USE_CORE_PIPELINE=false)
// ═══════════════════════════════════════════════════════════

export function buildSystemPrompt(params: {
  tier: string;
  propertyName: string;
  propertyAddress?: string;
  unitCount?: number;
  investmentStrategy?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  historicalContext?: string;
}): string {
  const colors = params.brandColors || { primary: '#27272A', secondary: '#EFF6FF', accent: '#2563EB' };

  return `<role>
You are an expert multifamily real estate analyst at a private equity firm. You write institutional-quality investor reports that are data-driven, concise, and visually compelling. Your reports are read by sophisticated investors who value precision and transparency.
</role>

<property_context>
<name>${params.propertyName}</name>
${params.propertyAddress ? `<address>${params.propertyAddress}</address>` : ''}
${params.unitCount ? `<units>${params.unitCount}</units>` : ''}
${params.investmentStrategy ? `<investment_strategy>${params.investmentStrategy}</investment_strategy>` : ''}
</property_context>

<tier_config>
<tier>${params.tier}</tier>
${params.tier === 'foundational' ? `<instructions>Concise report with 4 sections. Use KPI metric cards but NO charts or graphs. Keep narrative brief.</instructions>` : ''}
${params.tier === 'professional' ? `<instructions>Polished report with up to 10 sections. Include inline HTML/SVG charts and data tables.</instructions>` : ''}
${params.tier === 'institutional' ? `<instructions>Comprehensive institutional-grade report with up to 15 sections. Include premium HTML/SVG visualizations.</instructions>` : ''}
</tier_config>

<brand_colors>
<primary>${colors.primary}</primary>
<secondary>${colors.secondary}</secondary>
<accent>${colors.accent}</accent>
<usage_guide>
Primary (${colors.primary}): headers, chart bars, table headers, KPI card accents
Secondary (${colors.secondary}): backgrounds, alternating row colors, light fills
Accent (${colors.accent}): highlights, trend indicators, links
Success: #059669 (green). Warning: #D97706 (amber). Danger: #DC2626 (red).
Text: #1E293B (dark). Muted: #64748B. All charts: inline CSS only.
</usage_guide>
</brand_colors>

${params.historicalContext ? `<historical_data>\n${params.historicalContext}\n</historical_data>` : ''}

<critical_rules>
<rule priority="highest">STOP AT NOI. Never include debt service, loan payments, capex, distributions, or any below-the-line items unless the user explicitly provides this data.</rule>
<rule>Use exact dollar amounts and percentages from the uploaded documents.</rule>
<rule>Format: $1,234,567 | 94.5% | +3.2% or -1.5%</rule>
<rule>Never fabricate data. Missing data = "included": false.</rule>
</critical_rules>

<visualization_rules>
${params.tier === 'foundational' ? `Use KPI metric cards only — no SVG charts.` : ''}
${params.tier !== 'foundational' ? `Generate inline HTML/SVG charts in the "chart_html" field. Charts must be self-contained with inline CSS. Use brand colors.` : ''}
</visualization_rules>

<output_format>
Respond with ONLY a JSON object. No markdown fences, no preamble.
Your response must start with { and end with }.

{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Narrative text ONLY — no HTML charts. Plain text with <strong> for emphasis.",
      "chart_html": "HTML charts from templates go here. Empty string if no chart.",
      "metrics": [{"label": "Name", "value": "$X", "change": "+X%", "changeDirection": "up", "vsbudget": "+X%"}],
      "included": true,
      "skipReason": null
    }
  ],
  "analysis_summary": {
    "overall_sentiment": "improving|stable|declining",
    "key_findings": ["finding 1"],
    "data_quality_notes": ["any issues"]
  }
}

CRITICAL: The "sections" array MUST preserve the EXACT order from <sections_to_generate>.
Sections are numbered. Your response array index must match the order numbers.
Do NOT rearrange or sort sections.

Generate ALL sections listed in <sections_to_generate>. Do NOT stop after the first section.
For sections with insufficient data: set "included": false with a "skipReason".
</output_format>`;
}

export function buildAnalysisPrompt(params: {
  sections: SectionDefinition[];
  selectedMonth: number;
  selectedYear: number;
  questionnaireAnswers: Record<string, string>;
  distributionStatus: string;
  distributionNote: string;
  fileContents: Record<string, string>;
}): string {
  const monthName = MONTH_NAMES[params.selectedMonth - 1];

  let prompt = `Generate the investor report for ${monthName} ${params.selectedYear}.\n\n`;

  prompt += `<uploaded_documents>\n`;
  if (params.fileContents.t12) {
    prompt += `<t12_operating_statement>\n${params.fileContents.t12}\n</t12_operating_statement>\n\n`;
  } else {
    prompt += `<t12_operating_statement>NOT PROVIDED</t12_operating_statement>\n\n`;
  }
  if (params.fileContents.rent_roll) prompt += `<rent_roll>\n${params.fileContents.rent_roll}\n</rent_roll>\n\n`;
  if (params.fileContents.leasing_activity) prompt += `<leasing_activity>\n${params.fileContents.leasing_activity}\n</leasing_activity>\n\n`;
  if (params.fileContents.budget) prompt += `<annual_budget>\n${params.fileContents.budget}\n</annual_budget>\n\n`;
  const additionalKeys = Object.keys(params.fileContents).filter(k => !['t12', 'rent_roll', 'leasing_activity', 'budget'].includes(k));
  for (const key of additionalKeys) {
    prompt += `<additional_document type="${key}">\n${params.fileContents[key]}\n</additional_document>\n\n`;
  }
  prompt += `</uploaded_documents>\n\n`;

  const answeredQuestions = Object.entries(params.questionnaireAnswers).filter(([_, v]) => v?.trim());
  if (answeredQuestions.length > 0) {
    prompt += `<asset_manager_notes>\n`;
    for (const [key, value] of answeredQuestions) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      prompt += `<note category="${key}">${label}: ${value}</note>\n`;
    }
    prompt += `</asset_manager_notes>\n\n`;
  }

  if (params.distributionStatus && params.distributionStatus !== 'none') {
    prompt += `<distribution_status><status>${params.distributionStatus}</status>${params.distributionNote ? `<note>${params.distributionNote}</note>` : ''}</distribution_status>\n\n`;
  }

  // ── Sections — EXPLICITLY NUMBERED for order enforcement ──
  prompt += `<sections_to_generate>
IMPORTANT: Generate sections in EXACTLY this order. Do NOT rearrange.\n\n`;
  for (let i = 0; i < params.sections.length; i++) {
    const section = params.sections[i];
    prompt += `<section order="${i + 1}" id="${section.id}" title="${section.title}" conditional="${section.isConditional}" visualizations="${section.visualizations}">\n${section.promptGuidance}\n</section>\n\n`;
  }
  prompt += `</sections_to_generate>\n\n`;

  prompt += `<final_instructions>
<instruction>Use the ${monthName} column from the T-12 as "current month" data.</instruction>
<instruction>Calculate variances against the prior month column and budget column if available.</instruction>
<instruction>Return a SINGLE JSON response containing ALL ${params.sections.length} sections. Do NOT stop after the first section.</instruction>
<instruction>For conditional sections with no supporting data, set "included": false with a clear "skipReason".</instruction>
<instruction>Charts and tables go in the "chart_html" field as inline HTML. KPI metrics go in the "metrics" array.</instruction>
<instruction>STOP AT NOI. Do not calculate or reference debt service, capex, or distributions unless the asset manager explicitly provided that data.</instruction>
<instruction>Your response must be a complete JSON object with a "sections" array containing exactly ${params.sections.length} section objects and an "analysis_summary" object.</instruction>
<instruction>The "sections" array MUST match the EXACT order from <sections_to_generate> (order 1 first, order 2 second, etc.). Do NOT reorder sections.</instruction>
</final_instructions>`;

  return prompt;
}
