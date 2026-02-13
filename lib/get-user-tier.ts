// lib/get-user-tier.ts
import { supabaseAdmin as supabase } from './supabase';

export type UserTier = 'foundational' | 'professional' | 'institutional';

/** Server-side: get user tier from subscription or dev override */
export async function getUserTier(userId: string, devOverride?: string | null): Promise<UserTier> {
  if (process.env.NODE_ENV === 'development' && devOverride && devOverride !== 'none') {
    return devOverride as UserTier;
  }

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscription?.tier) return subscription.tier as UserTier;
  } catch {
    // No active subscription
  }

  return 'foundational';
}

/** Client-side: read tier override from localStorage (dev only) */
export function getClientTierOverride(): string | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'development') return null;
  return localStorage.getItem('writeup_tier_override');
}
