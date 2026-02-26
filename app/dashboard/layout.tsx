'use client';

import { UserButton, useAuth } from '@clerk/nextjs';
import GenerationToast from '@/components/generation-toast';
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

type TierOverride = 'none' | 'foundational' | 'professional' | 'institutional';

const tierColors: Record<TierOverride, { text: string; bg: string }> = {
  none:           { text: C.textSoft, bg: `${C.bgAlt}` },
  foundational:   { text: '#B8960F',  bg: '#C8B88A18' },
  professional:   { text: C.accent,   bg: '#00B7DB10' },
  institutional:  { text: '#002D5F',  bg: '#002D5F10' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      {children}
      {userId && <GenerationToast userId={userId} />}
    </div>
  );
}
