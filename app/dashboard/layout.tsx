'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

type TierOverride = 'none' | 'foundational' | 'professional' | 'institutional';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tierOverride, setTierOverride] = useState<TierOverride>('none');
  const [showTierMenu, setShowTierMenu] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDev) {
      const stored = localStorage.getItem('writeup_tier_override') as TierOverride | null;
      if (stored) setTierOverride(stored);
    }
  }, [isDev]);

  const handleTierChange = (tier: TierOverride) => {
    setTierOverride(tier);
    if (tier === 'none') {
      localStorage.removeItem('writeup_tier_override');
    } else {
      localStorage.setItem('writeup_tier_override', tier);
    }
    setShowTierMenu(false);
    window.dispatchEvent(new CustomEvent('tierOverrideChanged', { detail: tier }));
  };

  const tierColors: Record<TierOverride, string> = {
    none: 'bg-slate-100 text-slate-600',
    foundational: 'bg-amber-100 text-amber-700',
    professional: 'bg-cyan-100 text-cyan-700',
    institutional: 'bg-violet-100 text-violet-700',
  };

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === href ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900">writeup-ai</Link>
            <nav className="flex items-center gap-2">
              <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
              <Link href="/dashboard/properties" className={linkClass('/dashboard/properties')}>Properties</Link>
              <Link href="/dashboard/reports" className={linkClass('/dashboard/reports')}>Reports</Link>
              <Link href="/dashboard/settings" className={linkClass('/dashboard/settings')}>Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isDev && (
              <div className="relative">
                <button
                  onClick={() => setShowTierMenu(!showTierMenu)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 transition-all ${tierColors[tierOverride]}`}
                >
                  {tierOverride === 'none' ? 'DEV: No Override' : `DEV: ${tierOverride}`}
                </button>
                {showTierMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTierMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
                      <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Tier Testing Override</p>
                      {(['none', 'foundational', 'professional', 'institutional'] as TierOverride[]).map((tier) => (
                        <button
                          key={tier}
                          onClick={() => handleTierChange(tier)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            tierOverride === tier ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tier === 'none' ? 'No Override (use Stripe)' : (
                            <span className="flex items-center justify-between">
                              <span className="capitalize">{tier}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${tierColors[tier]}`}>
                                {tier === 'foundational' ? '4 sections' : tier === 'professional' ? '10 sections' : '15 sections'}
                              </span>
                            </span>
                          )}
                        </button>
                      ))}
                      <div className="mt-2 px-3 py-2 border-t border-slate-100">
                        <p className="text-xs text-slate-400">Overrides the Stripe tier for testing. Dev only.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
