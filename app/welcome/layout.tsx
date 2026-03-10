// ============================================================
// FILE: app/welcome/layout.tsx
// PURPOSE: Standalone funnel layout. No sidebar. No dashboard.
//          Route: /welcome (NOT /dashboard/welcome)
// INSTALL: Create folder app/welcome/ and drop this in.
// ============================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome — WriteUp AI",
  description: "Generate your complimentary investor report",
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
