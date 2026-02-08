/**
 * Defines the standard sections for every investor report.
 * These match what institutional LPs expect to see.
 */

export type ReportSection = {
  id: string
  title: string
  description: string
  order: number
  required: boolean
}

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: 'High-level overview with key metrics and takeaways (2-3 sentences)',
    order: 1,
    required: true,
  },
  {
    id: 'occupancy_leasing',
    title: 'Occupancy & Leasing',
    description: 'Current occupancy, move-ins/outs, lease velocity, renewal rates',
    order: 2,
    required: true,
  },
  {
    id: 'financial_performance',
    title: 'Financial Performance',
    description: 'Revenue, collections, NOI, budget variance, trade-outs',
    order: 3,
    required: true,
  },
  {
    id: 'capital_projects',
    title: 'Capital Projects',
    description: 'CapEx progress, completed projects, upcoming work, budget tracking',
    order: 4,
    required: false,
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Staffing, maintenance, vendor updates, operational improvements',
    order: 5,
    required: false,
  },
  {
    id: 'market_outlook',
    title: 'Market & Outlook',
    description: 'Submarket conditions, competitive positioning, forward guidance',
    order: 6,
    required: true,
  },
]

export type StructuredReport = {
  sections: {
    [sectionId: string]: {
      title: string
      content: string
      order: number
    }
  }
  generatedAt: string
  modelUsed: string
  tokensUsed: {
    input: number
    output: number
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format basis points change
 */
export function formatBps(bps: number): string {
  const sign = bps >= 0 ? '+' : ''
  return `${sign}${bps}bps`
}
