// lib/supabase-browser.ts

/**
 * Shared browser-side Supabase client — SINGLETON.
 *
 * Every browser component that needs Supabase Realtime or client-side
 * queries should import from here instead of calling createClient()
 * directly. This eliminates the "Multiple GoTrueClient instances
 * detected" warnings.
 *
 * NOTE: This is the ANON client (public key). It does NOT have
 * service-role access. For server-side admin operations, use
 * supabaseAdmin from lib/supabase.ts.
 *
 * WriteUp AI uses Clerk for auth (not Supabase Auth), so the
 * GoTrueClient is unused — but Supabase still instantiates it
 * internally. One instance = one warning at most, not dozens.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(sbUrl, sbKey, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return browserClient;
}
