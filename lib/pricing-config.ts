// lib/pricing-config.ts
// ═══════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH — All pricing, limits, and tier config
// Change values here and they propagate everywhere.
// ═══════════════════════════════════════════════════════════════

export type PlanTier = 'foundational' | 'professional' | 'institutional'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

// ─── Pricing Per Property ───

export const PRICING: Record<PlanTier, Record<BillingCycle, number>> = {
  foundational: {
    monthly:    75,
    quarterly:  207,   // ~8% off → $69/mo equivalent
    yearly:     747,   // ~17% off → $62.25/mo equivalent
  },
  professional: {
    monthly:    299,
    quarterly:  825,   // ~8% off → $275/mo equivalent  
    yearly:     2978,  // ~17% off → $248.17/mo equivalent
  },
  institutional: {
    monthly:    750,
    quarterly:  2070,  // ~8% off → $690/mo equivalent
    yearly:     7470,  // ~17% off → $622.50/mo equivalent
  },
}

// ─── Billing Discounts (display only) ───

export const BILLING_DISCOUNTS: Record<BillingCycle, number> = {
  monthly:   0,
  quarterly: 8,
  yearly:    17,
}

// ─── Plan Limits ───

export const PLAN_LIMITS: Record<PlanTier, {
  maxUsers: number           // Clerk seat limit
  maxReportsPerProperty: number
  sections: number
}> = {
  foundational: {
    maxUsers: 1,
    maxReportsPerProperty: 1,
    sections: 4,
  },
  professional: {
    maxUsers: 3,
    maxReportsPerProperty: -1,  // unlimited
    sections: 10,
  },
  institutional: {
    maxUsers: 10,
    maxReportsPerProperty: -1,  // unlimited
    sections: 15,
  },
}

// ─── Plan Display Info ───

export const PLAN_INFO: Record<PlanTier, {
  name: string
  description: string
  featured: boolean
  features: string[]
  limitations: string[]
}> = {
  foundational: {
    name: 'Foundational',
    description: 'Essential reports for small portfolios',
    featured: false,
    features: [
      '1 report per property/month',
      `${PLAN_LIMITS.foundational.sections} report sections`,
      'PDF & HTML export',
      'T-12 parsing & analysis',
      'Email support',
    ],
    limitations: [
      'No inline charts',
      'No custom branding',
      'Single user only',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'Full-featured reports for growing firms',
    featured: true,
    features: [
      'Unlimited reports per property',
      `${PLAN_LIMITS.professional.sections} report sections with charts`,
      'Custom branding (logo & colors)',
      'T-12 & rent roll deep analysis',
      'Budget vs. actual variance',
      `Up to ${PLAN_LIMITS.professional.maxUsers} team members`,
      'Priority support',
    ],
    limitations: [],
  },
  institutional: {
    name: 'Institutional',
    description: 'Enterprise-grade for large portfolios',
    featured: false,
    features: [
      'Everything in Professional',
      `${PLAN_LIMITS.institutional.sections} report sections`,
      `Up to ${PLAN_LIMITS.institutional.maxUsers} team members`,
      'Custom report templates',
      'API access',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    limitations: [],
  },
}

// ─── Hours Saved (for ROI calculator) ───

export const HOURS_SAVED_PER_PROPERTY: Record<PlanTier, number> = {
  foundational:  3,
  professional:  5,
  institutional: 7,
}

// ─── Helper Functions ───

export function getMonthlyEquivalent(tier: PlanTier, cycle: BillingCycle): number {
  const price = PRICING[tier][cycle]
  switch (cycle) {
    case 'monthly':   return price
    case 'quarterly': return price / 3
    case 'yearly':    return price / 12
  }
}

export function getOriginalMonthlyTotal(tier: PlanTier, cycle: BillingCycle): number | null {
  if (cycle === 'monthly') return null
  const monthlyPrice = PRICING[tier].monthly
  return cycle === 'quarterly' ? monthlyPrice * 3 : monthlyPrice * 12
}

export function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ─── Free tier fallback (no subscription) ───

export const FREE_PROPERTY_LIMIT = 2  // Enough to try the product
export const FREE_USER_LIMIT = 1
