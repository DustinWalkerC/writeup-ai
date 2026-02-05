import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  // Check if user is logged in
  const { userId } = await auth();

  return (
    <main className="min-h-screen flex flex-col bg-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="text-white font-bold text-xl">writeup-ai</div>

        <div className="flex items-center gap-4">
          {userId ? (
            // If logged in, show dashboard link
            <Link
              href="/dashboard"
              className="px-4 py-2 text-white hover:text-blue-400 transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            // If not logged in, show auth links
            <>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-white hover:text-blue-400 transition-colors"
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white text-center mb-6">
          AI-Powered Investor Reports
        </h1>

        <p className="text-xl text-slate-400 text-center max-w-2xl mb-8">
          Generate professional investor reports for your multifamily portfolio
          in minutes, not hours. Upload your T-12, answer a few questions, and
          let AI do the rest.
        </p>

        <div className="flex gap-4">
          <Link
            href={userId ? "/dashboard" : "/sign-up"}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {userId ? "Go to Dashboard" : "Start Free Trial"}
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-white font-semibold mb-2">
              Smart T-12 Parsing
            </h3>
            <p className="text-slate-400 text-sm">
              Upload your financials and watch AI extract the key metrics
            </p>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-3">✍️</div>
            <h3 className="text-white font-semibold mb-2">
              AI-Written Narratives
            </h3>
            <p className="text-slate-400 text-sm">
              Professional write-ups generated in your voice
            </p>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="text-white font-semibold mb-2">Beautiful Exports</h3>
            <p className="text-slate-400 text-sm">
              Export to PDF, HTML, or email-ready format
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-500 text-sm">
        Built by Dustin Walker. © 2026 writeup-ai. All rights reserved.
      </footer>
    </main>
  );
}
