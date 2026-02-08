/**
 * Data types for the report template
 * These structures feed the visual template components
 */

export type KPIMetric = {
  label: string
  value: string | number
  format: 'percent' | 'currency' | 'number' | 'text'
  change?: {
    value: number
    direction: 'up' | 'down' | 'flat'
    comparison: string // "vs LM", "vs Budget", "YoY"
  }
  status?: 'good' | 'warning' | 'critical' | 'neutral'
}

export type ProgressMetric = {
  label: string
  current: number
  target: number
  format: 'percent' | 'currency' | 'number'
  status?: 'on-track' | 'at-risk' | 'behind'
}

export type TableRow = {
  label: string
  actual: number | string
  budget?: number | string
  variance?: number | string
  variancePercent?: number
  notes?: string
}

export type ReportTemplateData = {
  // Header
  propertyName: string
  propertyAddress?: string
  reportPeriod: string // "January 2025"
  reportDate: string // "February 5, 2025"

  // KPI Dashboard (top of report)
  kpis: {
    occupancy?: KPIMetric
    collections?: KPIMetric
    avgRent?: KPIMetric
    noi?: KPIMetric
    leaseVelocity?: KPIMetric
    renewalRate?: KPIMetric
  }

  // Progress Indicators
  progress?: {
    occupancyTarget?: ProgressMetric
    budgetYTD?: ProgressMetric
    capexCompletion?: ProgressMetric
    leaseUpProgress?: ProgressMetric
  }

  // Financial Summary Table
  financialSummary?: {
    revenue?: TableRow[]
    expenses?: TableRow[]
    noi?: TableRow
  }

  // Narrative Sections (from AI)
  sections: {
    id: string
    title: string
    content: string
    order: number
  }[]

  // Metadata
  templateVersion: string
  generatedAt: string

  // Branding / footer
  companyName: string
  disclaimer: string
  accentColor: string
}

/**
 * Format a number as currency
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a change value with sign
 */
export function formatChange(value: number, format: 'percent' | 'currency' | 'bps'): string {
  const sign = value >= 0 ? '+' : ''
  if (format === 'percent') return `${sign}${value.toFixed(1)}%`
  if (format === 'bps') return `${sign}${Math.round(value * 100)}bps`
  if (format === 'currency') return `${sign}${formatCurrency(value, true)}`
  return `${sign}${value}`
}

/**
 * Determine status color based on value and thresholds
 */
export function getStatusFromValue(
  value: number,
  thresholds: { good: number; warning: number },
  higherIsBetter: boolean = true
): 'good' | 'warning' | 'critical' {
  if (higherIsBetter) {
    if (value >= thresholds.good) return 'good'
    if (value >= thresholds.warning) return 'warning'
    return 'critical'
  } else {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.warning) return 'warning'
    return 'critical'
  }
}
