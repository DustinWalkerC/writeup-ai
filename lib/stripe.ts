import Stripe from 'stripe'
import type { PlanTier, BillingCycle } from '@/lib/plans'

// Re-export types so server files can import from either location
export type { PlanTier, BillingCycle } from '@/lib/plans'

// Pass only the secret key — the SDK will use its own default API version
// that matches your installed stripe package version. No config object needed.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Server-only price ID mapping
const PRICE_IDS: Record<PlanTier, Record<BillingCycle, string>> = {
  foundational: {
    monthly: process.env.STRIPE_PRICE_FOUNDATIONAL_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_FOUNDATIONAL_QUARTERLY!,
    yearly: process.env.STRIPE_PRICE_FOUNDATIONAL_YEARLY!,
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_PROFESSIONAL_QUARTERLY!,
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY!,
  },
  institutional: {
    monthly: process.env.STRIPE_PRICE_INSTITUTIONAL_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_INSTITUTIONAL_QUARTERLY!,
    yearly: process.env.STRIPE_PRICE_INSTITUTIONAL_YEARLY!,
  },
}

export function getPriceId(tier: PlanTier, cycle: BillingCycle): string {
  return PRICE_IDS[tier][cycle]
}
