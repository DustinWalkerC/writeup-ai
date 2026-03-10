// ============================================================
// FILE: app/welcome/page.tsx
// PURPOSE: Server component. Auth check, fetch user data,
//          render WelcomeClient.
// INSTALL: Drop into app/welcome/page.tsx
// ============================================================

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import WelcomeClient from "./welcome-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function WelcomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Check if user already used free report
  const { data: settings } = await supabase
    .from("user_settings")
    .select("free_report_used")
    .eq("user_id", userId)
    .maybeSingle();

  // If already used, send to dashboard
  if (settings?.free_report_used) {
    redirect("/dashboard");
  }

  // Get user info from Clerk
  const user = await currentUser();
  const userEmail =
    user?.emailAddresses?.[0]?.emailAddress || "";
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  return (
    <WelcomeClient
      userId={userId}
      userEmail={userEmail}
      userName={userName}
    />
  );
}
