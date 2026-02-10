'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { PLANS, type PlanTier, type BillingCycle } from '@/lib/plans'

// Hours saved per property per month, by tier
const HOURS_SAVED: Record<PlanTier, number> = {
  foundational: 3,    // Basic automation — PDF export, simple summary
  professional: 5,    // Charts, branding, deep analysis save more manual work
  institutional: 7,   // Custom templates, API, full automation
}

export default function PricingPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [selectedTier, setSelectedTier] = useState<PlanTier>('professional')
  const [propertyCount, setPropertyCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    if (!isSignedIn) {
      router.push('/sign-up?redirect=/dashboard/pricing')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, billingCycle, propertyCount }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Cost calculations
  const priceInfo = PLANS[selectedTier].prices[billingCycle]
  const monthlyCostPerProperty =
    billingCycle === 'monthly'
      ? priceInfo.amount
      : billingCycle === 'quarterly'
        ? priceInfo.amount / 3
        : priceInfo.amount / 12

  const totalMonthlyCost = monthlyCostPerProperty * propertyCount
  const totalPeriodCost = priceInfo.amount * propertyCount

  // Savings calculations
  const hoursSavedPerMonth = HOURS_SAVED[selectedTier] * propertyCount

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const periodLabel =
    billingCycle === 'monthly' ? 'mo' : billingCycle === 'quarterly' ? 'qtr' : 'yr'
  const periodLabelFull =
    billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Build Your Plan
        </h1>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto">
          Choose your tier, pick how many properties, and see your ROI instantly.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white flex items-center justify-center text-xs font-bold">1</span>
          <span className="font-medium text-slate-900">Choose Tier</span>
        </div>
        <div className="w-8 h-px bg-slate-300" />
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white flex items-center justify-center text-xs font-bold">2</span>
          <span className="font-medium text-slate-900">Configure</span>
        </div>
        <div className="w-8 h-px bg-slate-300" />
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">3</span>
          <span className="text-slate-500">Checkout</span>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['monthly', 'quarterly', 'yearly'] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === cycle
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
              {cycle === 'quarterly' && (
                <span className="ml-1.5 text-xs font-semibold text-emerald-600">Save 8%</span>
              )}
              {cycle === 'yearly' && (
                <span className="ml-1.5 text-xs font-semibold text-emerald-600">Save 17%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── STEP 1: Tier Cards ─── */}
      <div className="grid md:grid-cols-3 gap-5">
        {(Object.entries(PLANS) as [PlanTier, (typeof PLANS)[PlanTier]][]).map(
          ([tier, plan]) => {
            const tierPrice = plan.prices[billingCycle]
            const isSelected = selectedTier === tier
            const monthlyEquiv =
              billingCycle === 'monthly'
                ? tierPrice.amount
                : billingCycle === 'quarterly'
                  ? tierPrice.amount / 3
                  : tierPrice.amount / 12

            return (
              <div
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                    : 'border border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                {/* Radio indicator */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-cyan-500' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" />
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      ${Math.round(monthlyEquiv)}
                    </span>
                    <span className="text-slate-400 text-sm">/property/mo</span>
                  </div>
                  {tierPrice.originalAmount && (
                    <p className="text-emerald-600 text-xs mt-1 font-medium">
                      Save ${(tierPrice.originalAmount - tierPrice.amount).toFixed(0)} per property vs monthly
                    </p>
                  )}
                </div>

                {/* Time saved badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium mb-4">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saves ~{HOURS_SAVED[tier]} hrs/property/month
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-600">{f}</span>
                    </li>
                  ))}
                  {plan.limitations.map((l, i) => (
                    <li key={`l-${i}`} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-slate-400">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
        )}
      </div>

      {/* ─── STEP 2: Configure + ROI ─── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Property Count + Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            How many properties?
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Each property gets its own slot. Add or remove anytime.
          </p>

          {/* Slider + Input */}
          <div className="flex items-center gap-4 mb-6">
            <input
              type="range"
              min="1"
              max="50"
              value={propertyCount}
              onChange={(e) => setPropertyCount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <input
              type="number"
              min="1"
              value={propertyCount}
              onChange={(e) =>
                setPropertyCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center font-bold text-lg"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Plan</span>
              <span className="font-medium text-slate-900">{PLANS[selectedTier].name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Properties</span>
              <span className="font-medium text-slate-900">{propertyCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Per property</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(priceInfo.amount)}/{periodLabelFull}
              </span>
            </div>
            {billingCycle !== 'monthly' && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Per property/mo equivalent</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(monthlyCostPerProperty)}/mo
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <div className="text-right">
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(totalPeriodCost)}
                </span>
                <span className="text-slate-400 text-sm">/{periodLabel}</span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full mt-5 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isLoading
              ? 'Loading...'
              : `Get Started — ${formatCurrency(totalPeriodCost)}/${periodLabel}`}
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Cancel anytime · No long-term contracts · 14-day money-back guarantee
          </p>
        </div>

        {/* Right: Hours Reclaimed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Hours Reclaimed Every Month
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Time you get back with {propertyCount} properties on {PLANS[selectedTier].name}
          </p>

          {/* Big number */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-5xl font-bold text-slate-900">
              {hoursSavedPerMonth.toFixed(0)}
            </div>
            <div className="text-sm font-medium text-cyan-700 mt-1">
              hours back every month
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {HOURS_SAVED[selectedTier]} hrs saved per property × {propertyCount} properties
            </div>
          </div>

          {/* What you get back */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Stop compiling reports manually</div>
                <div className="text-xs text-slate-500">No more copy-pasting from T-12s and rent rolls into Word docs</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Focus on investor relations</div>
                <div className="text-xs text-slate-500">Spend time on strategy and LP communication, not formatting</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Consistent, professional output</div>
                <div className="text-xs text-slate-500">Every report follows the same institutional-quality standard</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Scale without adding headcount</div>
                <div className="text-xs text-slate-500">Grow your portfolio without proportionally growing your reporting burden</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
