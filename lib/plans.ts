// lib/plans.ts
// Re-exports from pricing-config for backward compatibility.
// All pricing values now live in lib/pricing-config.ts (single source of truth).

import {
  PRICING, BILLING_DISCOUNTS, PLAN_INFO, PLAN_LIMITS,
  HOURS_SAVED_PER_PROPERTY, getMonthlyEquivalent as _getMonthlyEquivalent,
  type PlanTier, type BillingCycle,
} from './pricing-config'

export type { PlanTier, BillingCycle }

export type PriceInfo = {
  amount: number
  originalAmount?: number
  discount?: number
}

export type PlanConfig = {
  name: string
  description: string
  featured?: boolean
  features: string[]
  limitations: string[]
  prices: Record<BillingCycle, PriceInfo>
}

// Build the PLANS object from pricing-config (backward-compatible shape)
function buildPriceInfo(tier: PlanTier, cycle: BillingCycle): PriceInfo {
  const amount = PRICING[tier][cycle]
  const discount = BILLING_DISCOUNTS[cycle]
  if (discount > 0) {
    const monthlyBase = PRICING[tier].monthly
    const originalAmount = cycle === 'quarterly' ? monthlyBase * 3 : monthlyBase * 12
    return { amount, originalAmount, discount }
  }
  return { amount }
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  foundational: {
    ...PLAN_INFO.foundational,
    prices: {
      monthly: buildPriceInfo('foundational', 'monthly'),
      quarterly: buildPriceInfo('foundational', 'quarterly'),
      yearly: buildPriceInfo('foundational', 'yearly'),
    },
  },
  professional: {
    ...PLAN_INFO.professional,
    prices: {
      monthly: buildPriceInfo('professional', 'monthly'),
      quarterly: buildPriceInfo('professional', 'quarterly'),
      yearly: buildPriceInfo('professional', 'yearly'),
    },
  },
  institutional: {
    ...PLAN_INFO.institutional,
    prices: {
      monthly: buildPriceInfo('institutional', 'monthly'),
      quarterly: buildPriceInfo('institutional', 'quarterly'),
      yearly: buildPriceInfo('institutional', 'yearly'),
    },
  },
}

export function getMonthlyEquivalent(tier: PlanTier, cycle: BillingCycle): number {
  return _getMonthlyEquivalent(tier, cycle)
}

// Re-export limits and hours for convenience
export { PLAN_LIMITS, HOURS_SAVED_PER_PROPERTY } from './pricing-config'
