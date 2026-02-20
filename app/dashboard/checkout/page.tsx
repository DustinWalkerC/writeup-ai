'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  PRICING, BILLING_DISCOUNTS, PLAN_INFO,
  getMonthlyEquivalent, formatCurrency,
  type PlanTier, type BillingCycle,
} from '@/lib/pricing-config'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const VALID_TIERS: PlanTier[] = ['foundational', 'professional', 'institutional']
const VALID_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly']

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
}
const CYCLE_SHORT: Record<BillingCycle, string> = {
  monthly: 'mo', quarterly: 'qtr', yearly: 'yr',
}
const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 3, yearly: 12,
}

type Step = 'configure' | 'payment'

export default function CheckoutPage() {
  const searchParams = useSearchParams()

  const tierParam = searchParams.get('tier') as PlanTier | null
  const cycleParam = searchParams.get('cycle') as BillingCycle | null
  const propParam = searchParams.get('properties')

  const [tier, setTier] = useState<PlanTier>(
    tierParam && VALID_TIERS.includes(tierParam) ? tierParam : 'professional'
  )
  const [cycle, setCycle] = useState<BillingCycle>(
    cycleParam && VALID_CYCLES.includes(cycleParam) ? cycleParam : 'monthly'
  )
  const [qty, setQty] = useState(propParam ? Math.max(1, parseInt(propParam) || 5) : 5)
  const [step, setStep] = useState<Step>('configure')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const checkoutRef = useRef<any>(null)

  const plan = PLAN_INFO[tier]
  const perProperty = PRICING[tier][cycle]
  const monthlyEq = getMonthlyEquivalent(tier, cycle)
  const discount = BILLING_DISCOUNTS[cycle]
  const total = perProperty * qty
  const totalMonthly = monthlyEq * qty
  const short = CYCLE_SHORT[cycle]
  const months = CYCLE_MONTHS[cycle]

  const destroy = useCallback(() => {
    if (checkoutRef.current) {
      checkoutRef.current.destroy()
      checkoutRef.current = null
    }
  }, [])

  useEffect(() => () => destroy(), [destroy])

  const handleProceed = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle: cycle, propertyCount: qty }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const stripe = await stripePromise
      if (!stripe) throw new Error('Failed to load Stripe')

      destroy()
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret })
      checkoutRef.current = checkout
      setStep('payment')
      setTimeout(() => {
        if (containerRef.current) checkout.mount(containerRef.current)
      }, 50)
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    destroy()
    setStep('configure')
    setError(null)
  }

  const decrement = () => setQty((q) => Math.max(1, q - 1))
  const increment = () => setQty((q) => q + 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        {step === 'configure' ? (
          <Link href="/dashboard/pricing" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Plans
          </Link>
        ) : (
          <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Edit order
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'configure' ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white' : 'bg-emerald-500 text-white'
          }`}>{step === 'payment' ? '✓' : '1'}</span>
          <span className={`text-sm font-medium ${step === 'configure' ? 'text-slate-900' : 'text-emerald-600'}`}>Review</span>
        </div>
        <div className="w-10 h-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'payment' ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white' : 'bg-slate-200 text-slate-400'
          }`}>2</span>
          <span className={`text-sm ${step === 'payment' ? 'font-medium text-slate-900' : 'text-slate-400'}`}>Payment</span>
        </div>
      </div>

      {/* ═══ STEP 1: CONFIGURE ═══ */}
      {step === 'configure' && (
        <div className="grid md:grid-cols-3 gap-8">
          {/* ── Left: Plan + Quantity + Features ── */}
          <div className="md:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 pb-0">
                <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
              </div>

              {/* Tier Tabs */}
              <div className="px-6 pt-5">
                <label className="text-sm font-medium text-slate-600 mb-2 block">Select your plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {VALID_TIERS.map((t) => {
                    const active = tier === t
                    return (
                      <button
                        key={t}
                        onClick={() => setTier(t)}
                        className={`relative p-4 rounded-xl text-left transition-all ${
                          active
                            ? 'ring-2 ring-cyan-500 bg-cyan-50/40'
                            : 'border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {PLAN_INFO[t].featured && (
                          <span className="absolute -top-2 right-3 px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                            Popular
                          </span>
                        )}
                        <div className="text-sm font-semibold text-slate-900">{PLAN_INFO[t].name}</div>
                        <div className="mt-1">
                          <span className="text-xl font-extrabold text-slate-900">{formatCurrency(PRICING[t].monthly)}</span>
                          <span className="text-xs text-slate-400">/prop/mo</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Billing Cycle */}
              <div className="px-6 pt-5">
                <label className="text-sm font-medium text-slate-600 mb-2 block">Billing cycle</label>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                  {VALID_CYCLES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCycle(c)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        cycle === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {CYCLE_LABEL[c]}
                      {BILLING_DISCOUNTS[c] > 0 && (
                        <span className="ml-1 text-xs font-semibold text-emerald-600">
                          Save {BILLING_DISCOUNTS[c]}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Quantity */}
              <div className="px-6 pt-5 pb-6">
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Properties in your portfolio
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={decrement}
                    disabled={qty <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-10 text-center text-lg font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <button
                    onClick={increment}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <span className="text-sm text-slate-400">
                    × {formatCurrency(perProperty)}/{short} each
                  </span>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                Included in {plan.name}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
              {plan.limitations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-3">
                  {plan.limitations.map((l, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <svg className="w-5 h-5 text-slate-300 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-slate-400">{l}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="md:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Order summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium text-slate-900">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Properties</span>
                  <span className="font-medium text-slate-900">{qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing</span>
                  <span className="font-medium text-slate-900">
                    {CYCLE_LABEL[cycle]}
                    {discount > 0 && <span className="ml-1 text-emerald-600 text-xs">({discount}% off)</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Per property</span>
                  <span className="font-medium text-slate-900">{formatCurrency(perProperty)}/{short}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">Total</span>
                  <div className="text-right">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(total)}</span>
                      <span className="text-sm text-slate-400">/{short}</span>
                    </div>
                    {cycle !== 'monthly' && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatCurrency(totalMonthly)}/mo effective
                      </div>
                    )}
                  </div>
                </div>
                {discount > 0 && (
                  <p className="text-xs text-emerald-600 font-medium text-right mt-1">
                    You save {formatCurrency((PRICING[tier].monthly * months * qty) - total)} vs. monthly
                  </p>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleProceed}
                disabled={loading}
                className="w-full mt-5 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <>Continue to Payment</>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure
                </span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: PAYMENT ═══ */}
      {step === 'payment' && (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Stripe Embedded Checkout */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[480px]">
              <div ref={containerRef} id="stripe-checkout" />
            </div>
          </div>

          {/* Compact Summary */}
          <div className="md:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Your order</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium text-slate-900">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Properties</span>
                  <span className="font-medium text-slate-900">{qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing</span>
                  <span className="font-medium text-slate-900">{CYCLE_LABEL[cycle]}</span>
                </div>
              </div>
              <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-slate-900">{formatCurrency(total)}</span>
                  <span className="text-sm text-slate-400">/{short}</span>
                </div>
              </div>

              {/* Features reminder */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                {plan.features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
