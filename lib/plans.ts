// Client-safe plan configuration
// NO process.env, NO Stripe SDK — safe for 'use client' components

export type PlanTier = 'foundational' | 'professional' | 'institutional'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

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

export const PLANS: Record<PlanTier, PlanConfig> = {
  foundational: {
    name: 'Foundational',
    description: 'Essential reports for small portfolios',
    features: [
      '1 report per property/month',
      'Basic financial summary',
      'PDF export',
      'Email support',
    ],
    limitations: [
      'No charts or graphs',
      'No custom branding',
      'Basic AI analysis',
    ],
    prices: {
      monthly: { amount: 75 },
      quarterly: { amount: 206.33, originalAmount: 225, discount: 8 },
      yearly: { amount: 747, originalAmount: 900, discount: 17 },
    },
  },
  professional: {
    name: 'Professional',
    description: 'Full-featured reports for growing firms',
    featured: true,
    features: [
      'Unlimited reports per property',
      'AI-generated charts & graphs',
      'Custom branding (logo & colors)',
      'In-depth data analysis',
      'T-12 & rent roll parsing',
      'Priority support',
    ],
    limitations: [],
    prices: {
      monthly: { amount: 299 },
      quarterly: { amount: 822.55, originalAmount: 897, discount: 8 },
      yearly: { amount: 2978.04, originalAmount: 3588, discount: 17 },
    },
  },
  institutional: {
    name: 'Institutional',
    description: 'Enterprise-grade for large portfolios',
    features: [
      'Everything in Professional',
      'Custom report templates',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    limitations: [],
    prices: {
      monthly: { amount: 750 },
      quarterly: { amount: 2063.25, originalAmount: 2250, discount: 8 },
      yearly: { amount: 7470, originalAmount: 9000, discount: 17 },
    },
  },
}

export function getMonthlyEquivalent(tier: PlanTier, cycle: BillingCycle): number {
  const price = PLANS[tier].prices[cycle].amount
  switch (cycle) {
    case 'monthly': return price
    case 'quarterly': return price / 3
    case 'yearly': return price / 12
  }
}
