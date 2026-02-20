import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe, getPriceId } from '@/lib/stripe'
import type { PlanTier, BillingCycle } from '@/lib/plans'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    if (!userId || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tier, billingCycle, propertyCount } = (await request.json()) as {
      tier: PlanTier; billingCycle: BillingCycle; propertyCount: number
    }
    if (!tier || !billingCycle || !propertyCount || propertyCount < 1)
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })

    const priceId = getPriceId(tier, billingCycle)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).single()
    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { clerk_user_id: userId },
      })
      customerId = customer.id
      await supabase.from('subscriptions').upsert({ user_id: userId, stripe_customer_id: customerId, plan_tier: 'free', property_slots: 0, status: 'inactive' })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      ui_mode: 'embedded',
      line_items: [{ price: priceId, quantity: propertyCount }],
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { user_id: userId, tier, billing_cycle: billingCycle, property_count: propertyCount.toString() },
      subscription_data: { metadata: { user_id: userId, tier, billing_cycle: billingCycle, property_count: propertyCount.toString() } },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
