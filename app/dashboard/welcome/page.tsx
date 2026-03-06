// app/dashboard/welcome/page.tsx
// WriteUp AI — Onboarding Welcome Page (Server Component)
// Checks auth, subscription status, renders WelcomeClient

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import WelcomeClient from "./welcome-client";

export const metadata = {
  title: "Welcome — WriteUp AI",
  description: "Generate your complimentary investor report",
};

export default async function WelcomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Check if user already has an active subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status, tier")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  // If already subscribed, skip funnel
  if (sub) {
    redirect("/dashboard");
  }

  // Check if free report was already used
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("free_report_used, free_report_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (settings?.free_report_used) {
    redirect("/dashboard/pricing");
  }

  // Get user email from Clerk for pre-filling the email field on Screen 6
  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const userName = user?.firstName || "";

  // Ensure user_settings row exists
  if (!settings) {
    await supabaseAdmin.from("user_settings").upsert(
      {
        user_id: userId,
        free_report_used: false,
      },
      { onConflict: "user_id" }
    );
  }

  return <WelcomeClient userId={userId} userEmail={userEmail} userName={userName} />;
}
