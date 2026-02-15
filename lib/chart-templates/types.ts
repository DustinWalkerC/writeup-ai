// lib/chart-templates/types.ts

/**
 * CORE — Chart Template Type Definitions
 * These types define the color system and template interfaces
 * used throughout the report generation pipeline.
 */

/**
 * Brand colors resolved from user_settings.
 *
 * DB Column Mapping:
 *   user_settings.accent_color      → primary   (report headers, chart bars)
 *   user_settings.secondary_color   → secondary (backgrounds, alt rows)
 *   user_settings.report_accent_color → accent  (highlights, trend lines)
 *
 * Semantic colors (green/red/amber) are ALWAYS fixed — never user-selectable.
 */
export interface BrandColors {
  primary: string;    // Headers, chart bars, table headers, KPI card borders
  secondary: string;  // Card backgrounds, alternating table rows, light fills
  accent: string;     // Highlights, trend indicators, budget reference lines, sparkline dots
  green: string;      // Always #059669 — favorable variances
  red: string;        // Always #DC2626 — unfavorable variances
  amber: string;      // Always #D97706 — caution items
}

/** KPI metric for the metrics[] array in each section */
export interface KPIMetric {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'flat';
  vsbudget?: string;
}

/** A single row in a budget variance table */
export interface VarianceRow {
  category: string;
  actual: number;
  budget: number | null;
  prior: number | null;
  favorableWhenLow?: boolean; // true for expense items
}

/** A waterfall chart item */
export interface WaterfallItem {
  label: string;
  value: number;
  type: 'total' | 'addition' | 'subtraction';
}

/** A horizontal bar chart item */
export interface HorizontalBarItem {
  name: string;
  actual: number;
  budget: number | null;
  prior?: number | null;
}

/** A trend bar chart data point */
export interface TrendBarPoint {
  label: string;
  value: number;
  budget?: number | null;
}

/** Rent roll unit mix row */
export interface UnitMixRow {
  floorplan: string;
  unitCount: number;
  avgRent: number | null;
  avgSqft: number | null;
  rentPerSqft: number | null;
  occupancyPct: number | null;
}

/** Risk item for risk cards */
export interface RiskItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  mitigation: string;
}

/** Move-in/out data */
export interface MoveData {
  moveIns: number;
  moveOuts: number;
  renewals: number;
  label: string;
}

/** Report header data */
export interface ReportHeader {
  companyName?: string;
  logoUrl?: string;
  propertyName: string;
  month: string;
  year: number;
}
