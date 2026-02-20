'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS (inline, matching globals.css variables)
   ═══════════════════════════════════════════════════════════════ */
const C = {
  accent:    '#00B7DB',
  accentD:   '#1D98B1',
  bg:        '#FFFFFF',
  bgAlt:     '#F7F5F1',
  bgWarm:    '#FAF9F7',
  text:      '#1A1A1A',
  textMid:   '#4A4A4A',
  textSoft:  '#7A7A7A',
  textMuted: '#A3A3A3',
  border:    '#E8E5E0',
  borderL:   '#F0EDE8',
};

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS — No icon library. Stroke-based, 18x18.
   ═══════════════════════════════════════════════════════════════ */
const Icons = {
  home: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  grid: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  report: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  sliders: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    </svg>
  ),
  palette: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.37-.65-.37-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.36-8.92-10-8.92z"/>
    </svg>
  ),
  plus: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  menu: (c: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  x: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════
   NAV ITEM TYPE
   ═══════════════════════════════════════════════════════════════ */
type NavItem = {
  href: string;
  label: string;
  icon: (c: string) => React.ReactNode;
};

const navItems: NavItem[] = [
  { href: '/dashboard',            label: 'Dashboard',  icon: Icons.home },
  { href: '/dashboard/properties', label: 'Properties', icon: Icons.grid },
  { href: '/dashboard/reports',    label: 'Reports',    icon: Icons.report },
  { href: '/dashboard/settings',   label: 'Designer',   icon: Icons.sliders },
];

/* ═══════════════════════════════════════════════════════════════
   TIER OVERRIDE (Dev only)
   ═══════════════════════════════════════════════════════════════ */
type TierOverride = 'none' | 'foundational' | 'professional' | 'institutional';

const tierColors: Record<TierOverride, { text: string; bg: string }> = {
  none:           { text: C.textSoft, bg: `${C.bgAlt}` },
  foundational:   { text: '#B8960F',  bg: '#C8B88A18' },
  professional:   { text: C.accent,   bg: '#00B7DB10' },
  institutional:  { text: '#002D5F',  bg: '#002D5F10' },
};

/* ═══════════════════════════════════════════════════════════════
   LAYOUT COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tierOverride, setTierOverride] = useState<TierOverride>('none');
  const [showTierMenu, setShowTierMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isDev) {
      const stored = localStorage.getItem('writeup_tier_override') as TierOverride | null;
      if (stored) setTierOverride(stored);
    }
  }, [isDev]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bgAlt, fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>

      {/* ═══ MOBILE TOP BAR ═══ */}
      <div className="mobile-menu-btn" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.borderL}`,
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
        >
          {mobileOpen ? Icons.x(C.text) : Icons.menu(C.text)}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 12, color: '#fff',
          }}>W</div>
          <span style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 17, fontWeight: 500, color: C.text }}>WriteUp AI</span>
        </div>
        {/* Placeholder for spacing — UserButton lives in sidebar */}
        <div style={{ width: 28 }} />
      </div>

      {/* ═══ SIDEBAR OVERLAY (mobile) ═══ */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', marginBottom: 24 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, color: '#fff',
          }}>W</div>
          <span style={{ fontFamily: "var(--font-display, 'Newsreader', serif)", fontSize: 19, fontWeight: 500, color: C.text }}>WriteUp AI</span>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
              >
                <span style={{ opacity: active ? 1 : 0.5, display: 'flex', alignItems: 'center' }}>
                  {item.icon(active ? C.accent : C.textSoft)}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span style={{
                    marginLeft: 'auto', width: 5, height: 5,
                    borderRadius: '50%', background: C.accent,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="divider" style={{ margin: '20px 14px' }} />

        {/* Dev tier override */}
        {isDev && (
          <div style={{ padding: '0 8px', marginBottom: 12 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTierMenu(!showTierMenu)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
                  color: tierColors[tierOverride].text,
                  background: tierColors[tierOverride].bg,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}
              >
                {tierOverride === 'none' ? 'Dev: No Override' : `Dev: ${tierOverride}`}
              </button>

              {showTierMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowTierMenu(false)} />
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 8,
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
                    fontFamily: "var(--font-body)",
                  }}>
                    <div style={{
                      padding: '6px 10px', fontSize: 10, fontWeight: 600,
                      color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>Tier Override</div>
                    {(['none', 'foundational', 'professional', 'institutional'] as TierOverride[]).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleTierChange(tier)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: 8,
                          background: tierOverride === tier ? C.bgAlt : 'transparent',
                          border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: tierOverride === tier ? 600 : 500,
                          color: tierOverride === tier ? C.text : C.textMid,
                          fontFamily: "var(--font-body)",
                          transition: 'all 0.15s',
                        }}
                      >
                        <span>{tier === 'none' ? 'No Override' : tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                        {tier !== 'none' && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                            color: tierColors[tier].text,
                            background: tierColors[tier].bg,
                          }}>
                            {tier === 'foundational' ? '4 sec' : tier === 'professional' ? '10 sec' : '15 sec'}
                          </span>
                        )}
                      </button>
                    ))}
                    <div style={{
                      marginTop: 4, padding: '6px 10px', borderTop: `1px solid ${C.borderL}`,
                      fontSize: 11, color: C.textMuted,
                    }}>Dev only. Overrides Stripe tier.</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* New Report CTA */}
        <div style={{ padding: '0 8px', marginBottom: 8 }}>
          <Link
            href="/dashboard/reports/new"
            className="btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              padding: '11px 16px', fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {Icons.plus('#fff')}
            <span>New Report</span>
          </Link>
        </div>

        {/* User button */}
        <div style={{
          padding: '12px 14px', borderTop: `1px solid ${C.borderL}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {mounted ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.bgAlt }} />
          )}
          <span style={{ fontSize: 13, color: C.textSoft, fontWeight: 500 }}>Account</span>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        className="main-content"
        style={{
          marginLeft: 240,
          minHeight: '100vh',
          padding: '28px 32px',
        }}
      >
        {/* Mobile spacer for fixed top bar */}
        <div className="mobile-menu-btn" style={{ height: 56, display: 'none' }} />
        {children}
      </main>
    </div>
  );
}
