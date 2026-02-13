/**
 * Defines the standard sections for every investor report.
 * These match what institutional LPs expect to see.
 *
 * NOTE: Legacy section IDs (executive_summary through market_outlook) are kept
 * for backward compatibility with older reports. New section IDs from the Day 17
 * tier system are appended below. The canonical section definitions now live in
 * lib/section-definitions.ts — this file exists so the report viewer and other
 * components that import REPORT_SECTIONS continue to work.
 */

export type ReportSection = {
  id: string
  title: string
  description: string
  order: number
  required: boolean
}

export const REPORT_SECTIONS: ReportSection[] = [
  // ── Legacy sections (pre-Day 17) ────────────────────────────
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

  // ── New sections from Day 17 tier system ─────────────────────
  // Foundational tier additions
  {
    id: 'revenue_summary',
    title: 'Revenue Summary',
    description: 'Top-line revenue performance and effective rent',
    order: 7,
    required: false,
  },
  {
    id: 'expense_summary',
    title: 'Expense Summary',
    description: 'Total expenses and key categories',
    order: 8,
    required: false,
  },
  {
    id: 'asset_manager_outlook',
    title: 'Asset Manager Outlook',
    description: 'Forward-looking narrative from questionnaire',
    order: 9,
    required: false,
  },

  // Professional tier additions
  {
    id: 'revenue_analysis',
    title: 'Revenue Analysis',
    description: 'Detailed revenue breakdown with chart',
    order: 10,
    required: false,
  },
  {
    id: 'expense_analysis',
    title: 'Expense Analysis',
    description: 'Category-level expense breakdown with variance',
    order: 11,
    required: false,
  },
  {
    id: 'noi_performance',
    title: 'Net Operating Income',
    description: 'NOI with month-over-month or budget comparison chart',
    order: 12,
    required: false,
  },
  {
    id: 'rent_roll_insights',
    title: 'Rent Roll Insights',
    description: 'Unit mix, average rent by floorplan',
    order: 13,
    required: false,
  },
  {
    id: 'market_positioning',
    title: 'Market Positioning',
    description: 'Property vs submarket context',
    order: 14,
    required: false,
  },
  {
    id: 'capital_improvements',
    title: 'Capital & Improvements Update',
    description: 'Only if user provides capex info',
    order: 15,
    required: false,
  },
  {
    id: 'risk_watch_items',
    title: 'Risk & Watch Items',
    description: 'Data-driven risk flags and concerns',
    order: 16,
    required: false,
  },

  // Institutional tier additions
  {
    id: 'investment_thesis_update',
    title: 'Investment Thesis Update',
    description: 'Progress against original investment strategy',
    order: 17,
    required: false,
  },
  {
    id: 'lease_expiration_rollover',
    title: 'Lease Expiration & Rollover Analysis',
    description: 'Expiration schedule with rollover curve chart',
    order: 18,
    required: false,
  },
  {
    id: 'rent_roll_deep_dive',
    title: 'Rent Roll Deep Dive',
    description: 'Unit-level analysis with distribution and floorplan tables',
    order: 19,
    required: false,
  },
  {
    id: 'budget_vs_actual',
    title: 'Budget vs. Actual',
    description: 'Full variance analysis with chart',
    order: 20,
    required: false,
  },
  {
    id: 'market_submarket_analysis',
    title: 'Market & Submarket Analysis',
    description: 'Comps, rent trends, supply pipeline',
    order: 21,
    required: false,
  },
  {
    id: 'capital_improvements_tracker',
    title: 'Capital Improvements & Value-Add Tracker',
    description: 'Renovation progress and ROI tracking',
    order: 22,
    required: false,
  },
  {
    id: 'risk_matrix',
    title: 'Risk Matrix',
    description: 'Categorized risk table with severity ratings',
    order: 23,
    required: false,
  },
  {
    id: 'resident_operational_metrics',
    title: 'Resident & Operational Metrics',
    description: 'Turnover, work orders, collections if data available',
    order: 24,
    required: false,
  },
  {
    id: 'regulatory_compliance',
    title: 'Regulatory & Compliance Notes',
    description: 'Loan covenants, insurance, tax if data available',
    order: 25,
    required: false,
  },
  {
    id: 'asset_manager_strategic_outlook',
    title: 'Asset Manager Strategic Outlook',
    description: 'Comprehensive forward look with action items',
    order: 26,
    required: false,
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
