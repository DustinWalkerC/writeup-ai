'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PLANS, type PlanTier } from '@/lib/plans'

type Subscription = { plan_tier: string; billing_cycle: string; property_slots: number; status: string; current_period_end: string }
type Usage = { properties_used: number; properties_available: number }

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchSubscription() }, [])
  const fetchSubscription = async () => {
    try { const res = await fetch('/api/subscription'); const r = await res.json(); if (r.success) { setSubscription(r.data.subscription); setUsage(r.data.usage) } }
    catch (e) { console.error('Fetch error:', e) } finally { setIsLoading(false) }
  }
  const handleManageBilling = async () => {
    try { const res = await fetch('/api/stripe/portal', { method: 'POST' }); const { url, error } = await res.json(); if (error) throw new Error(error); if (url) window.location.href = url }
    catch (e) { console.error('Portal error:', e); alert('Failed to open billing portal') }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>

  const plan = subscription?.plan_tier && subscription.plan_tier in PLANS ? PLANS[subscription.plan_tier as PlanTier] : null
  const isActive = subscription?.status === 'active'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1><p className="text-slate-500 mt-1">Manage your subscription and billing details</p></div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
            {isActive && plan ? (<div className="mt-2"><span className="text-3xl font-bold text-slate-900">{plan.name}</span><span className="ml-2 px-2 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">Active</span><p className="text-slate-500 mt-1">{subscription.property_slots} slots · Billed {subscription.billing_cycle}</p></div>)
            : (<div className="mt-2"><span className="text-3xl font-bold text-slate-900">Free</span><span className="ml-2 px-2 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">No active subscription</span></div>)}
          </div>
          {isActive ? <button onClick={handleManageBilling} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Manage Billing</button>
          : <Link href="/pricing" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg font-medium">Upgrade Now</Link>}
        </div>
        {isActive && subscription.current_period_end && (<div className="mt-4 pt-4 border-t border-slate-100"><p className="text-sm text-slate-500">Next billing: <span className="font-medium text-slate-700">{new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p></div>)}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Property Usage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg"><div className="text-3xl font-bold text-slate-900">{usage?.properties_used || 0}</div><div className="text-sm text-slate-500">Used</div></div>
          <div className="text-center p-4 bg-slate-50 rounded-lg"><div className="text-3xl font-bold text-slate-900">{subscription?.property_slots || 0}</div><div className="text-sm text-slate-500">Total</div></div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg"><div className="text-3xl font-bold text-emerald-600">{usage?.properties_available || 0}</div><div className="text-sm text-emerald-600">Available</div></div>
        </div>
        <div className="mt-4"><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all" style={{ width: `${subscription?.property_slots ? ((usage?.properties_used || 0) / subscription.property_slots) * 100 : 0}%` }} /></div></div>
      </div>
      {isActive && plan && (<div className="bg-white rounded-xl border border-slate-200 p-6"><h2 className="text-lg font-semibold text-slate-900 mb-4">Your Plan Features</h2><ul className="grid grid-cols-2 gap-3">{plan.features.map((f, i) => (<li key={i} className="flex items-center gap-2 text-sm"><svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-slate-600">{f}</span></li>))}</ul></div>)}
    </div>
  )
}
