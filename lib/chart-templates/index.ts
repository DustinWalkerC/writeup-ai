// lib/chart-templates/index.ts

/**
 * CORE — Chart Template System Entry Point
 *
 * Resolves brand colors from user_settings and provides
 * access to the template library for the report generation pipeline.
 */

import { BrandColors } from './types';

export { type BrandColors } from './types';
export type {
  KPIMetric,
  VarianceRow,
  WaterfallItem,
  HorizontalBarItem,
  TrendBarPoint,
  UnitMixRow,
  RiskItem,
  MoveData,
  ReportHeader,
} from './types';

// Template sets
import * as standardTemplates from './standard';

/**
 * Resolves brand colors from user_settings into the CORE template color system.
 *
 * DB Column Mapping:
 *   user_settings.accent_color        → primary   (the user's "Primary Color" picker)
 *   user_settings.secondary_color     → secondary (the user's "Secondary Color" picker)
 *   user_settings.report_accent_color → accent    (the user's "Accent Color" picker) — NEW
 */
export function resolveBrandColors(settings: {
  accent_color?: string | null;
  secondary_color?: string | null;
  report_accent_color?: string | null;
}): BrandColors {
  return {
    primary: settings.accent_color || '#27272A',
    secondary: settings.secondary_color || '#EFF6FF',
    accent: settings.report_accent_color || '#2563EB',
    green: '#059669',
    red: '#DC2626',
    amber: '#D97706',
  };
}

/**
 * Returns the complete template set for a given report style.
 * Currently only 'standard' exists. Phase 2 will add 'mckinsey', 'modern', 'classic'.
 */
export function getTemplateSet(_styleId: string = 'standard') {
  // Phase 2: switch on styleId to return different template sets
  return standardTemplates;
}

/**
 * Generates the complete <visualization_templates> XML block
 * for injection into the Call 2 system prompt.
 *
 * Colors are passed in the user prompt (not interpolated here)
 * to preserve system prompt caching across users.
 */
export function buildVisualizationTemplatesBlock(): string {
  return `<visualization_templates>
You have access to pre-built chart templates. Generate chart HTML in the "chart_html" field (NOT in "content").
Reproduce template structure EXACTLY, replacing ONLY the data values and color tokens.
The "content" field must contain ONLY narrative text — no HTML charts, divs, tables, or SVGs.

WIDTH: All charts must work within a max-width of 816px (standard US letter page).
Use width:100% on chart containers. Tables use overflow-x:auto wrapper.
Grids with 4+ columns should use flex-wrap:wrap for narrow viewports.

COLOR TOKENS — the user prompt's <brand_colors> section defines:
  {{PRIMARY}}   — Report primary color (headers, chart bars, table headers, KPI borders)
  {{SECONDARY}} — Report secondary color (backgrounds, alternating rows, card fills)
  {{ACCENT}}    — Report accent color (highlights, trend lines, budget reference lines)
  {{GREEN}}     — #059669 (always — favorable variances)
  {{RED}}       — #DC2626 (always — unfavorable variances)
  {{AMBER}}     — #D97706 (always — caution items)

VARIANCE COLOR LOGIC:
  Revenue/Income items: increase = {{GREEN}}, decrease = {{RED}}
  Expense items: decrease = {{GREEN}}, increase = {{RED}} (lower expenses = favorable)
  Occupancy: increase = {{GREEN}}, decrease = {{RED}}

TEMPLATE: report_header
Use for: FIRST section (executive_summary) ONLY. Place in chart_html BEFORE any other chart content.
This is the institutional-grade report header — dark {{PRIMARY}} bar with property name, units, location,
report period, then an {{ACCENT}} accent stripe, then a 5-column KPI summary bar underneath.
Generate this ONCE per report, in the executive_summary section's chart_html only.
${standardTemplates.REPORT_HEADER_EXAMPLE}

TEMPLATE: kpi_strip
IMPORTANT: Do NOT generate kpi_strip HTML. The viewer renders KPI cards automatically from the "metrics" array.
Just populate the "metrics" JSON array with label, value, change, changeDirection, and vsbudget fields.
${standardTemplates.KPI_STRIP_EXAMPLE}

TEMPLATE: budget_variance_table
Use for: revenue_summary, expense_summary, budget_vs_actual
Structure: Table with Category | Actual | Budget | Variance $ | Variance % columns.
Color-code variance columns: favorable = green, unfavorable = red.
Include a totals row with 2px top border.
${standardTemplates.BUDGET_VARIANCE_TABLE_EXAMPLE}

TEMPLATE: revenue_waterfall
Use for: revenue_analysis
Structure: Vertical waterfall from GPR down through deductions to Net Revenue, then Other Income to Total Revenue.
Subtraction bars use {{RED}}, addition bars use {{GREEN}}, totals use {{PRIMARY}}.
${standardTemplates.REVENUE_WATERFALL_EXAMPLE}

TEMPLATE: expense_horizontal_bars
Use for: expense_analysis
Structure: Horizontal bars comparing Actual ({{PRIMARY}}) vs Budget (dashed outline) per expense category.
Variance amount and % shown on the right. Over-budget = red text, under-budget = green text.
${standardTemplates.EXPENSE_BARS_EXAMPLE}

TEMPLATE: occupancy_gauge
Use for: occupancy_leasing
Structure: SVG ring gauge showing physical occupancy %, numeric center display.
Below: a simpler bar showing economic occupancy. Units occupied / total shown.
${standardTemplates.OCCUPANCY_GAUGE_EXAMPLE}

TEMPLATE: noi_trend_bars
Use for: noi_performance
Structure: Vertical bar chart showing 3-6 months of NOI values.
Bars color-coded: beat budget = {{GREEN}}, missed budget = {{RED}}, no budget = {{PRIMARY}}.
Dashed horizontal line for budget target if available.
${standardTemplates.NOI_TREND_BARS_EXAMPLE}

TEMPLATE: rent_roll_table
Use for: rent_roll_insights
Structure: Table with Floorplan | Units | Avg Rent | Avg SF | Rent/SF | Occupancy columns.
Alternating row backgrounds using {{SECONDARY}}. Totals/average row at bottom.
${standardTemplates.RENT_ROLL_TABLE_EXAMPLE}

TEMPLATE: risk_cards
Use for: risk_watch_items, risk_matrix
Structure: Cards with colored left border (red=high, amber=medium, green=low).
Each card: severity badge, title, detail paragraph, mitigation recommendation.
${standardTemplates.RISK_CARDS_EXAMPLE}

TEMPLATE: move_in_out_bars
Use for: occupancy_leasing (leasing activity subsection)
Structure: Grouped bars showing Move-ins, Move-outs, Renewals for current vs prior month.
${standardTemplates.MOVE_IN_OUT_BARS_EXAMPLE}

TEMPLATE: comparison_table
Use for: market_positioning, any institutional section needing multi-column comparison
Structure: Generic multi-column table with {{PRIMARY}} header, alternating {{SECONDARY}} rows.
${standardTemplates.COMPARISON_TABLE_EXAMPLE}

CHART SELECTION BY SECTION:
- executive_summary → kpi_strip only
- revenue_summary → kpi_strip + budget_variance_table (income line items)
- expense_summary → kpi_strip + budget_variance_table (expense categories)
- revenue_analysis → kpi_strip + revenue_waterfall
- expense_analysis → kpi_strip + expense_horizontal_bars
- occupancy_leasing → kpi_strip + occupancy_gauge + move_in_out_bars (if leasing data)
- noi_performance → kpi_strip + noi_trend_bars
- rent_roll_insights → kpi_strip + rent_roll_table
- risk_watch_items → risk_cards
- budget_vs_actual → budget_variance_table (full P&L)
- market_positioning → comparison_table or kpi_strip
- asset_manager_outlook → kpi_strip only (no charts)
- All other sections → kpi_strip where metrics available

FOUNDATIONAL TIER: No chart_html — leave chart_html as empty string "".
PROFESSIONAL TIER: Use all templates except comparison_table.
INSTITUTIONAL TIER: Use all templates.

IMPORTANT: KPI metrics go in the "metrics" JSON array ONLY.
Do NOT generate kpi_strip HTML in chart_html. The viewer renders metrics automatically.
</visualization_templates>`;
}
