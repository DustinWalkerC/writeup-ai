import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // Use service role key — webhooks run without user auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabase)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub, supabase)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub, supabase)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, supabase)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Handler functions
// We use `as any` on Supabase data objects because our DB schema isn't typed
// at compile time. We also cast Stripe subscription fields that changed in
// newer SDK versions (current_period_start / current_period_end may be
// nested under a different shape depending on your stripe package version).
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const userId = session.metadata?.user_id
  const tier = session.metadata?.tier
  const billingCycle = session.metadata?.billing_cycle
  const propertyCount = parseInt(session.metadata?.property_count || '0')

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Retrieve the full subscription object from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // Extract period timestamps — cast to any because the Stripe SDK type
  // for current_period_start changed between v14 and v17
  const periodStart = (subscription as any).current_period_start
  const periodEnd = (subscription as any).current_period_end

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    plan_tier: tier,
    billing_cycle: billingCycle,
    property_slots: propertyCount,
    status: 'active',
    current_period_start: new Date(periodStart * 1000).toISOString(),
    current_period_end: new Date(periodEnd * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) console.error('Upsert error:', error)
  else console.log(`Subscription activated: user=${userId} tier=${tier} slots=${propertyCount}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  const userId = subscription.metadata?.user_id
  if (!userId) return

  const quantity = subscription.items.data[0]?.quantity || 0
  const periodStart = (subscription as any).current_period_start
  const periodEnd = (subscription as any).current_period_end

  const { error } = await supabase
    .from('subscriptions')
    .update({
      property_slots: quantity,
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) console.error('Subscription update error:', error)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  const userId = subscription.metadata?.user_id
  if (!userId) return

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) console.error('Subscription cancel error:', error)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  const customerId = invoice.customer as string

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) console.error('Payment failed update error:', error)
}

