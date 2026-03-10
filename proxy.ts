// proxy.ts — Root of project
// WriteUp AI — Clerk Auth + Subscription Gate
// Updated: March 8, 2026

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// Routes that don't require an active subscription
const isExemptFromSubscription = createRouteMatcher([
  "/dashboard/pricing",
  "/dashboard/checkout",
  "/dashboard/checkout/success",
  "/dashboard/billing",
]);

// API routes that don't require subscription
const isExemptApiRoute = (pathname: string) =>
  pathname.startsWith("/api/stripe") ||
  pathname.startsWith("/api/free-report") ||
  pathname.startsWith("/api/webhooks");

// Simple in-memory cache for subscription checks (avoids DB hit on every navigation)
const subCache = new Map<string, { status: string; freeReportUsed: boolean; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function getSubscriptionStatus(userId: string) {
  const now = Date.now();
  const cached = subCache.get(userId);
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If env vars aren't available, allow through rather than crashing
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[MIDDLEWARE] Supabase env vars not available — allowing through");
    return { status: "active", freeReportUsed: false, ts: now };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  // Check free report status
  const { data: settings } = await supabase
    .from("user_settings")
    .select("free_report_used")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const result = {
    status: sub?.status || "none",
    freeReportUsed: settings?.free_report_used || false,
    ts: now,
  };

  subCache.set(userId, result);
  return result;
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // /welcome is a public-ish route — requires auth but not subscription
  // Don't run subscription logic on it
  if (pathname.startsWith("/welcome")) {
    return NextResponse.next();
  }

  // Protect all dashboard routes with Clerk auth
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Skip subscription check for non-dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Skip subscription check for exempt routes
  if (isExemptFromSubscription(req)) {
    return NextResponse.next();
  }

  // Skip subscription check for API routes
  if (isExemptApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Get the user ID from Clerk
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.next();
  }

  try {
    const { status, freeReportUsed } = await getSubscriptionStatus(userId);

    // Active subscription — allow through
    if (status === "active" || status === "trialing") {
      return NextResponse.next();
    }

    // No subscription, free report not used — send to onboarding funnel
    if (!freeReportUsed) {
      const welcomeUrl = new URL("/welcome", req.url);
      return NextResponse.redirect(welcomeUrl);
    }

    // No subscription, free report already used — send to pricing paywall
    const pricingUrl = new URL("/dashboard/pricing", req.url);
    return NextResponse.redirect(pricingUrl);
  } catch (error) {
    // If subscription check fails, allow through rather than blocking
    console.error("[MIDDLEWARE] Subscription check failed:", error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
