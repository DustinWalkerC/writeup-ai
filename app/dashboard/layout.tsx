import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900">
              writeup-ai
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/properties"
                className="text-slate-600 hover:text-slate-900"
              >
                Properties
              </Link>
              <Link
                href="/dashboard/reports"
                className="text-slate-600 hover:text-slate-900"
              >
                Reports
              </Link>
            </nav>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
