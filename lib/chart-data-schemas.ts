// lib/chart-data-schemas.ts

/**
 * PHASE 1 — Chart Data Schemas
 *
 * TypeScript types for the chart_data JSON that Claude outputs.
 * These replace the old chart_html approach: instead of Claude generating
 * raw HTML markup (expensive, inconsistent), it outputs structured data
 * that the backend renders through deterministic templates.
 *
 * TOKEN SAVINGS: 80–90% fewer tokens vs chart_html.
 * VISUAL CONSISTENCY: Templates + brand colors + data = same look every time.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  FIVE-LAYER ARCHITECTURE — This file serves Layer 4 (AI)    │
 * │  and Layer 5 (Charts).                                      │
 * │                                                              │
 * │  Layer 4: Claude outputs chart_data (these types)            │
 * │  Layer 5: chart-renderer.ts (Phase 5) consumes chart_data   │
 * │           and produces deterministic HTML via templates.     │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Chart Types by Tier:
 *   Foundational  → KPI cards only (from metrics[], no chart_data)
 *   Professional  → waterfall, horizontal_bars, trend_line, risk_cards, gauge
 *   Institutional → All above + heatmap, stacked_bars
 */

// ═══════════════════════════════════════════════════════════
// CHART TYPE UNION
// ═══════════════════════════════════════════════════════════

export type ChartType =
  | 'waterfall'
  | 'horizontal_bars'
  | 'trend_line'
  | 'gauge'
  | 'risk_cards'
  | 'heatmap'
  | 'stacked_bars';

// ═══════════════════════════════════════════════════════════
// INDIVIDUAL CHART DATA SHAPES
// ═══════════════════════════════════════════════════════════

/**
 * Waterfall Chart — Revenue Analysis
 * Shows GPR → deductions → EGI → other income → Total Revenue
 * Subtraction bars = red, addition bars = green, totals = primary
 */
export interface WaterfallChartData {
  chart_type: 'waterfall';
  title: string;
  data: WaterfallItem[];
}

export interface WaterfallItem {
  label: string;
  value: number;
  type: 'start' | 'add' | 'subtract' | 'total';
  formatted_value?: string; // e.g. "$277,826"
}

/**
 * Horizontal Bars — Expense Analysis
 * Compares actual vs budget per expense category.
 * Over-budget = red variance text, under-budget = green.
 */
export interface HorizontalBarsChartData {
  chart_type: 'horizontal_bars';
  title: string;
  data: HorizontalBarItem[];
}

export interface HorizontalBarItem {
  category: string;
  actual: number;
  budget: number | null;
  variance_dollar: number | null;
  variance_percent: number | null;
  formatted_actual?: string;
  formatted_budget?: string;
}

/**
 * Trend Line — NOI Performance, Revenue Trends
 * Shows 3–12 months of data points connected by a line or as bars.
 * Budget target shown as dashed horizontal reference line.
 */
export interface TrendLineChartData {
  chart_type: 'trend_line';
  title: string;
  data: TrendPoint[];
  budget_target?: number | null;
  format?: 'currency' | 'percent' | 'number';
}

export interface TrendPoint {
  label: string; // month label, e.g. "Nov 2025"
  value: number;
  vs_budget?: 'above' | 'below' | 'none';
  formatted_value?: string;
}

/**
 * Gauge — Occupancy Display
 * SVG ring gauge showing occupancy percentage with numeric center.
 * Secondary metric bar (e.g., economic occupancy) below.
 */
export interface GaugeChartData {
  chart_type: 'gauge';
  title: string;
  data: {
    primary_value: number;       // e.g. 94.2 (physical occupancy %)
    primary_label: string;       // e.g. "Physical Occupancy"
    secondary_value?: number;    // e.g. 91.8 (economic occupancy %)
    secondary_label?: string;    // e.g. "Economic Occupancy"
    units_occupied?: number;
    units_total?: number;
    target?: number;             // e.g. 95.0 (target occupancy %)
  };
}

/**
 * Risk Cards — Risk & Watch Items, Risk Matrix
 * Colored cards with severity indicators.
 * Red border = high, amber = medium, green = low.
 */
export interface RiskCardsChartData {
  chart_type: 'risk_cards';
  title: string;
  data: RiskCardItem[];
}

export interface RiskCardItem {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  detail: string;
  trend?: 'improving' | 'stable' | 'worsening';
  mitigation?: string;
  data_point?: string; // specific number backing the risk
}

/**
 * Heatmap — Institutional Only
 * Grid visualization for lease expirations, rent distributions, etc.
 * Cells color-coded by intensity (low → green, mid → amber, high → red).
 */
export interface HeatmapChartData {
  chart_type: 'heatmap';
  title: string;
  data: {
    row_labels: string[];
    column_labels: string[];
    values: number[][];          // values[row][col]
    format?: 'currency' | 'percent' | 'count';
    color_scale?: 'green_red' | 'blue_scale' | 'severity';
  };
}

/**
 * Stacked Bars — Institutional Only
 * Multi-segment bars for composition analysis.
 * E.g., revenue composition over time, expense category breakdown by month.
 */
export interface StackedBarsChartData {
  chart_type: 'stacked_bars';
  title: string;
  data: {
    categories: string[];        // x-axis labels (e.g., months)
    series: StackedBarSeries[];  // each series = one segment color
    format?: 'currency' | 'percent' | 'number';
  };
}

export interface StackedBarSeries {
  name: string;                  // legend label
  values: number[];              // one value per category
  color_token?: string;          // e.g. "PRIMARY", "GREEN", "RED"
}

// ═══════════════════════════════════════════════════════════
// DISCRIMINATED UNION — The main type used in output schema
// ═══════════════════════════════════════════════════════════

/**
 * ChartData — discriminated union of all chart types.
 * Claude outputs one of these per section (or null for no chart).
 * The backend's chart-renderer.ts (Phase 5) will switch on chart_type
 * and call the appropriate template function.
 *
 * Usage in report-generator.ts:
 *   const html = renderChart(section.chart_data, brandColors);
 */
export type ChartData =
  | WaterfallChartData
  | HorizontalBarsChartData
  | TrendLineChartData
  | GaugeChartData
  | RiskCardsChartData
  | HeatmapChartData
  | StackedBarsChartData;

// ═══════════════════════════════════════════════════════════
// CALCULATION ENTRY — For Three-Layer Math Validation
// ═══════════════════════════════════════════════════════════

/**
 * CalculationEntry — Claude must return one of these for every
 * derived metric in the report. The math validator (Phase 2) uses
 * these to verify inputs, formulas, and arithmetic.
 *
 * Layer 1: Are the inputs correct? (match Source Data Registry)
 * Layer 2: Is the formula correct? (match Formula Registry)
 * Layer 3: Is the arithmetic correct? (re-execute with mathjs)
 */
export interface CalculationEntry {
  metric_name: string;
  inputs: Record<string, number>;
  formula: string;       // valid arithmetic expression using input keys
  ai_result: number;     // Claude's calculated result
}

// ═══════════════════════════════════════════════════════════
// SECTION OUTPUT TYPE — Complete section with all new fields
// ═══════════════════════════════════════════════════════════

/**
 * GeneratedSectionV2 — The target output type for Phase 1+.
 * Extends the existing GeneratedSection with chart_data and calculations.
 *
 * NOTE: chart_html is retained as a transitional field.
 * Phase 5 will remove chart_html once chart-renderer.ts handles
 * all rendering from chart_data.
 */
export interface GeneratedSectionV2 {
  id: string;
  title: string;
  content: string;                    // Narrative text only — no HTML
  chart_html?: string;                // TRANSITIONAL — removed in Phase 5
  chart_data?: ChartData | null;      // NEW — structured chart data for backend rendering
  metrics: Array<{
    label: string;
    value: string;
    change?: string;
    changeDirection?: 'up' | 'down' | 'flat';
    vsbudget?: string;
  }>;
  calculations?: CalculationEntry[];  // NEW — for three-layer math validation
  included: boolean;
  skipReason: string | null;
}

// ═══════════════════════════════════════════════════════════
// CHART TYPE → TIER ACCESS MAP
// ═══════════════════════════════════════════════════════════

/**
 * Which chart types are available per tier.
 * Used by prompt builders and by chart-renderer.ts (Phase 5)
 * to enforce tier gating on visual output.
 */
export const CHART_TYPE_ACCESS: Record<string, ChartType[]> = {
  foundational: [],
  professional: ['waterfall', 'horizontal_bars', 'trend_line', 'risk_cards', 'gauge'],
  institutional: ['waterfall', 'horizontal_bars', 'trend_line', 'risk_cards', 'gauge', 'heatmap', 'stacked_bars'],
};

/**
 * Recommended chart type per section.
 * Claude references this (via the prompt) to decide what chart_data to output.
 */
export const SECTION_CHART_TYPE_MAP: Record<string, ChartType | null> = {
  executive_summary:               null,
  revenue_summary:                 null,
  expense_summary:                 null,
  revenue_analysis:                'waterfall',
  expense_analysis:                'horizontal_bars',
  occupancy_leasing:               'gauge',
  noi_performance:                 'trend_line',
  rent_roll_insights:              null,       // uses HTML table, not chart_data
  rent_roll_deep_dive:             null,       // uses HTML table, not chart_data
  risk_watch_items:                'risk_cards',
  risk_matrix:                     'risk_cards',
  budget_vs_actual:                'horizontal_bars',
  market_positioning:              null,
  market_submarket_analysis:       null,
  capital_improvements:            null,
  capital_improvements_tracker:    null,
  investment_thesis_update:        null,
  lease_expiration_rollover:       'stacked_bars',
  asset_manager_outlook:           null,
  asset_manager_strategic_outlook: null,
  resident_operational_metrics:    null,
  regulatory_compliance:           null,
};
