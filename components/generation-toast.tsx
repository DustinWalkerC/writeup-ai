'use client';

/**
 * components/generation-toast.tsx
 *
 * Persistent generation status toasts — survives page refresh and navigation.
 *
 * STATE SOURCE: Supabase `reports` table
 *   - pipeline_stage = 'generating' → active generation with live progress
 *   - pipeline_stage transitions to 'in_review' → generation just completed
 *   - generation_progress (0-100) + generation_status_text → live updates
 *   - generation_completed_at → used to filter "recently completed" on mount
 *
 * PERSISTENCE: On mount, queries for active + recently-completed reports.
 *              Supabase Realtime pushes live updates.
 *              Dismissed state stored in reports.toast_dismissed_at.
 *
 * FIXES APPLIED:
 *   - W3: Uses shared Supabase browser client (eliminates GoTrueClient warnings)
 *   - Mobile: Cards go full-width on small screens, pill row adjusts for mobile top bar
 *
 * SQL MIGRATIONS:
 *   ALTER TABLE reports
 *     ADD COLUMN IF NOT EXISTS toast_dismissed_at TIMESTAMPTZ DEFAULT NULL;
 *   ALTER TABLE reports REPLICA IDENTITY FULL;
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ToastReport {
  id: string;
  property_name: string;
  report_month: string;
  toast_status: 'generating' | 'completed';
  progress: number;
  status_text: string;
  calculations?: number;
}

type ViewMode = 'expanded' | 'compact' | 'minimized';

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════

const C = {
  accent: '#00B7DB',
  accentD: '#1D98B1',
  bg: '#FFFFFF',
  bgAlt: '#F7F5F1',
  text: '#1A1A1A',
  textMid: '#4A4A4A',
  textSoft: '#7A7A7A',
  textMuted: '#A3A3A3',
  border: '#E8E5E0',
  borderL: '#F0EDE8',
  greenLight: '#008A3E',
};

const FD = "var(--font-display, 'Newsreader', Georgia, serif)";
const FB = "var(--font-body, 'DM Sans', system-ui, sans-serif)";

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(w => !['at', 'the', 'of', 'in', 'on', 'and', '&'].includes(w.toLowerCase()))
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPhaseLabel(progress: number, statusText?: string): string {
  if (statusText) return statusText;
  if (progress <= 30) return 'Extracting data...';
  if (progress <= 70) return 'Writing narrative...';
  if (progress <= 90) return 'Validating math...';
  return 'Finalizing...';
}

function fmtMonth(m?: number, y?: number): string {
  if (!m) return '';
  const n = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${n[m - 1] || ''} ${y || ''}`.trim();
}

function calcCount(log: any): number {
  if (!log) return 0;
  if (typeof log === 'object' && log.total_calculations) return log.total_calculations;
  if (Array.isArray(log?.results)) return log.results.length;
  return 0;
}

// ═══════════════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════════════

function ShieldCheck({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M11 2L3 6V11C3 15.97 6.42 20.63 11 22C15.58 20.63 19 15.97 19 11V6L11 2Z" stroke={C.greenLight} strokeWidth="1.5" fill={`${C.greenLight}10`} strokeLinejoin="round" />
    <path d="M7.5 11.5L9.5 13.5L14.5 8.5" stroke={C.greenLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
function CheckCircleIcon({ size = 13 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" stroke={C.greenLight} strokeWidth="1.5" fill={`${C.greenLight}12`} />
    <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke={C.greenLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
function SpinnerSvg({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="gen-toast-spinner">
    <circle cx="10" cy="10" r="8" stroke={`${C.accent}20`} strokeWidth="2" />
    <path d="M10 2a8 8 0 0 1 8 8" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
  </svg>);
}
function CloseXIcon({ size = 12 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke={C.textMuted} strokeWidth="1.4" strokeLinecap="round" />
  </svg>);
}
function ArrowRightIcon() {
  return (<svg width={11} height={11} viewBox="0 0 14 14" fill="none">
    <path d="M3 7H11M8 4L11 7L8 10" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
function ChevronUpIcon() {
  return (<svg width={12} height={12} viewBox="0 0 14 14" fill="none">
    <path d="M3.5 9L7 5.5L10.5 9" stroke={C.textSoft} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
function ChevronDownIcon() {
  return (<svg width={11} height={11} viewBox="0 0 14 14" fill="none">
    <path d="M3.5 5.5L7 9L10.5 5.5" stroke={C.textSoft} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
function MinimizeLineIcon({ size = 12 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="3" y="6.5" width="8" height="1.5" rx="0.75" fill={C.textSoft} />
  </svg>);
}

function IBtn({ onClick, children, style }: { onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', ...style }}
      onMouseEnter={e => (e.currentTarget.style.background = C.bgAlt)}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >{children}</button>
  );
}

// ═══════════════════════════════════════════════════════════
// MINIMIZED PILLS
// ═══════════════════════════════════════════════════════════

function MinGenPill({ item, onExpand }: { item: ToastReport; onExpand: () => void }) {
  const ini = getInitials(item.property_name);
  const r = 17, circ = 2 * Math.PI * r, offset = circ - (item.progress / 100) * circ;
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={onExpand} title={`${item.property_name} — ${item.progress}%`} className="gen-toast-pill" style={{
        width: 42, height: 42, borderRadius: 11, background: C.bg, border: `1px solid ${C.border}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.07)', cursor: 'pointer', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = C.border; }}
      >
        <svg width={38} height={38} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx="19" cy="19" r={r} fill="none" stroke={C.borderL} strokeWidth="2" />
          <circle cx="19" cy="19" r={r} fill="none" stroke={C.accent} strokeWidth="2.5"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
        </svg>
        <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>{ini}</span>
      </button>
    </div>
  );
}

function MinDonePill({ item, onExpand, onDismiss }: { item: ToastReport; onExpand: () => void; onDismiss: () => void }) {
  const ini = getInitials(item.property_name);
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <button onClick={onExpand} title={`${item.property_name} — ready`} className="gen-toast-pill-done" style={{
        width: 42, height: 42, borderRadius: 11, background: C.bg, border: `1.5px solid ${C.greenLight}35`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = `${C.greenLight}60`; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = `${C.greenLight}35`; }}
      >
        <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, color: C.greenLight, letterSpacing: '-0.02em' }}>{ini}</span>
      </button>
      <button onClick={e => { e.stopPropagation(); onDismiss(); }} style={{
        position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%',
        background: C.bg, border: `1px solid ${C.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
        opacity: hov ? 1 : 0, transform: hov ? 'scale(1)' : 'scale(0.7)',
        transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
      }}><CloseXIcon size={8} /></button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXPANDED CARDS
// ═══════════════════════════════════════════════════════════

function GenExpanded({ item, onCompact, onMinimize }: { item: ToastReport; onCompact: () => void; onMinimize: () => void }) {
  const phase = getPhaseLabel(item.progress, item.status_text);
  return (
    <div className="gen-toast-card" style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 8px 28px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SpinnerSvg size={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FD, fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.property_name}</div>
          <div style={{ fontFamily: FB, fontSize: 10.5, color: C.accent, marginTop: 2, fontWeight: 500 }}>{phase}</div>
        </div>
        <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: C.textMid, flexShrink: 0 }}>{item.progress}%</span>
        <IBtn onClick={onCompact}><ChevronUpIcon /></IBtn>
        <IBtn onClick={onMinimize} style={{ marginLeft: -4 }}><MinimizeLineIcon /></IBtn>
      </div>
      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ width: '100%', height: 3, borderRadius: 2, background: C.borderL, overflow: 'hidden' }}>
          <div style={{ width: `${item.progress}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${C.accent}, ${C.accentD})`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>
    </div>
  );
}

function DoneExpanded({ item, onDismiss, onCompact, onMinimize, onView }: { item: ToastReport; onDismiss: () => void; onCompact: () => void; onMinimize: () => void; onView: () => void }) {
  return (
    <div className="gen-toast-card" style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 8px 28px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 12px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: `${C.greenLight}0C`, border: `1px solid ${C.greenLight}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <ShieldCheck size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: C.text }}>Report Ready</span>
            <span style={{ fontFamily: FB, fontSize: 9, fontWeight: 700, color: C.greenLight, background: `${C.greenLight}0D`, padding: '1px 6px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Verified</span>
          </div>
          <div style={{ fontFamily: FD, fontSize: 14.5, fontWeight: 500, color: C.text, marginTop: 3, lineHeight: 1.2 }}>{item.property_name}</div>
          <div style={{ fontFamily: FB, fontSize: 10.5, color: C.textSoft, marginTop: 2.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            {item.report_month && <span>{item.report_month}</span>}
            {item.calculations ? (<>{item.report_month && <span style={{ width: 2, height: 2, borderRadius: '50%', background: C.textMuted, display: 'inline-block' }} />}<span style={{ color: C.greenLight, fontWeight: 500 }}>{item.calculations} verified</span></>) : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, marginTop: -2, marginRight: -4 }}>
          <IBtn onClick={onDismiss}><CloseXIcon /></IBtn>
          <IBtn onClick={onCompact}><ChevronUpIcon /></IBtn>
          <IBtn onClick={onMinimize}><MinimizeLineIcon /></IBtn>
        </div>
      </div>
      <div style={{ padding: '8px 12px 10px', borderTop: `1px solid ${C.borderL}` }}>
        <button onClick={onView} style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 2px 8px ${C.accent}30`, transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = C.accentD)}
          onMouseLeave={e => (e.currentTarget.style.background = C.accent)}
        >View Report <ArrowRightIcon /></button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPACT CARDS
// ═══════════════════════════════════════════════════════════

function GenCompact({ item, onExpand, onMinimize }: { item: ToastReport; onExpand: () => void; onMinimize: () => void }) {
  return (
    <div className="gen-toast-compact" style={{ background: C.bg, borderRadius: 9, border: `1px solid ${C.border}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <SpinnerSvg size={13} />
        <span style={{ fontFamily: FD, fontSize: 12.5, fontWeight: 500, color: C.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.property_name}</span>
        <span style={{ fontFamily: FB, fontSize: 10.5, color: C.accent, fontWeight: 600, flexShrink: 0 }}>{item.progress}%</span>
        <IBtn onClick={onExpand} style={{ padding: 2 }}><ChevronDownIcon /></IBtn>
        <IBtn onClick={onMinimize} style={{ padding: 2, marginLeft: -4 }}><MinimizeLineIcon size={11} /></IBtn>
      </div>
      <div style={{ height: 2, background: C.borderL }}>
        <div style={{ width: `${item.progress}%`, height: '100%', background: C.accent, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

function DoneCompact({ item, onDismiss, onExpand, onMinimize, onView }: { item: ToastReport; onDismiss: () => void; onExpand: () => void; onMinimize: () => void; onView: () => void }) {
  return (
    <div className="gen-toast-compact" style={{ background: C.bg, borderRadius: 9, border: `1px solid ${C.border}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${C.greenLight}0D`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircleIcon size={13} /></div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 4, overflow: 'hidden' }}>
        <span style={{ fontFamily: FD, fontSize: 12.5, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.property_name}</span>
        <span style={{ fontFamily: FB, fontSize: 10.5, color: C.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>ready</span>
      </div>
      <button onClick={onView} style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>View</button>
      <IBtn onClick={onExpand} style={{ padding: 2 }}><ChevronDownIcon /></IBtn>
      <IBtn onClick={onMinimize} style={{ padding: 2, marginLeft: -4 }}><MinimizeLineIcon size={11} /></IBtn>
      <IBtn onClick={onDismiss} style={{ padding: 2, marginLeft: -4 }}><CloseXIcon size={11} /></IBtn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CSS — mobile-optimized
// ═══════════════════════════════════════════════════════════

const CSS = `
@keyframes gen-toast-slideDown { from { opacity:0; transform:translateY(-14px) } to { opacity:1; transform:translateY(0) } }
@keyframes gen-toast-compactIn { from { opacity:0; transform:translateY(-6px) scale(.98) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes gen-toast-pillIn { from { opacity:0; transform:scale(.7) } to { opacity:1; transform:scale(1) } }
@keyframes gen-toast-completePulse { 0% { transform:scale(.85); opacity:0 } 50% { transform:scale(1.08) } 100% { transform:scale(1); opacity:1 } }
@keyframes gen-toast-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
.gen-toast-spinner   { animation: gen-toast-spin 1.2s linear infinite }
.gen-toast-card      { animation: gen-toast-slideDown .4s cubic-bezier(.22,1,.36,1) forwards }
.gen-toast-compact   { animation: gen-toast-compactIn .3s cubic-bezier(.22,1,.36,1) forwards }
.gen-toast-pill      { animation: gen-toast-pillIn .35s cubic-bezier(.22,1,.36,1) forwards }
.gen-toast-pill-done { animation: gen-toast-completePulse .5s cubic-bezier(.22,1,.36,1) forwards }

/* ── Mobile: push below fixed top bar, full-width cards ── */
@media (max-width: 640px) {
  .gen-toast-pills-row  { top: 64px !important; right: 12px !important }
  .gen-toast-card-stack { top: 64px !important; right: 12px !important; left: 12px !important }
  .gen-toast-card,
  .gen-toast-compact    { width: 100% !important }
}
@media (min-width: 641px) and (max-width: 900px) {
  .gen-toast-pills-row  { top: 68px !important }
  .gen-toast-card-stack { top: 120px !important }
}`;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function GenerationToast({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastReport[]>([]);
  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});
  const cssRef = useRef(false);

  // ── W3 FIX: Use shared singleton client ──
  const sb = getSupabaseBrowserClient();

  // Ref to track current toast IDs without stale closures
  const toastIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    toastIdsRef.current = new Set(toasts.map(t => t.id));
  }, [toasts]);

  // Inject CSS once
  useEffect(() => {
    if (cssRef.current) return;
    cssRef.current = true;
    const el = document.createElement('style');
    el.id = 'gen-toast-css';
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { const s = document.getElementById('gen-toast-css'); if (s) document.head.removeChild(s); };
  }, []);

  // ═══════════════════════════════════════════════════════
  // PERSISTENCE: Load on mount
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const load = async () => {
      // 1) Active: pipeline_stage = 'generating'
      const { data: gen } = await sb
        .from('reports')
        .select('id, pipeline_stage, generation_progress, generation_status_text, validation_log, selected_month, selected_year, properties(name)')
        .eq('user_id', userId)
        .is('toast_dismissed_at', null)
        .eq('pipeline_stage', 'generating')
        .order('created_at', { ascending: false })
        .limit(10);

      // 2) Recently completed: pipeline_stage = 'in_review' + generation_completed_at within 2h
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: done } = await sb
        .from('reports')
        .select('id, pipeline_stage, generation_progress, generation_status_text, validation_log, selected_month, selected_year, generation_completed_at, properties(name)')
        .eq('user_id', userId)
        .is('toast_dismissed_at', null)
        .eq('pipeline_stage', 'in_review')
        .gte('generation_completed_at', cutoff)
        .order('generation_completed_at', { ascending: false })
        .limit(10);

      const rows = [...(gen || []), ...(done || [])];
      if (!rows.length) return;

      setToasts(rows.map((r: any) => ({
        id: r.id,
        property_name: r.properties?.name || 'Unknown Property',
        report_month: fmtMonth(r.selected_month, r.selected_year),
        toast_status: r.pipeline_stage === 'generating' ? 'generating' : 'completed',
        progress: r.generation_progress || (r.pipeline_stage !== 'generating' ? 100 : 0),
        status_text: r.generation_status_text || '',
        calculations: calcCount(r.validation_log),
      })));
    };
    load();
  }, [userId, sb]);

  // ═══════════════════════════════════════════════════════
  // REALTIME: Watch for pipeline_stage changes
  //
  // No server-side filter — Clerk auth means user_id
  // filters are silently ignored by Supabase Realtime.
  // We filter client-side instead.
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const channel = sb
      .channel('gen-toast-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          // ── Client-side user filter ──
          if (row.user_id) {
            if (row.user_id !== userId) return;
          } else {
            if (!toastIdsRef.current.has(row.id)) return;
          }

          const stage = row.pipeline_stage;
          if (stage !== 'generating' && stage !== 'in_review') return;
          if (row.toast_dismissed_at) return;

          const toastStatus: 'generating' | 'completed' =
            stage === 'generating' ? 'generating' : 'completed';

          setToasts(prev => {
            const existing = prev.find(t => t.id === row.id);
            const updated: ToastReport = {
              id: row.id,
              property_name: existing?.property_name || 'Property',
              report_month: existing?.report_month || '',
              toast_status: toastStatus,
              progress: row.generation_progress || (toastStatus === 'completed' ? 100 : 0),
              status_text: row.generation_status_text || '',
              calculations: calcCount(row.validation_log),
            };
            return existing
              ? prev.map(t => t.id === row.id ? updated : t)
              : [...prev, updated];
          });

          // Auto-expand from minimized when completed
          if (toastStatus === 'completed') {
            setViewModes(prev =>
              prev[row.id] === 'minimized'
                ? { ...prev, [row.id]: 'expanded' }
                : prev
            );
          }

          // Fetch real property name for new toasts
          setToasts(prev => {
            const t = prev.find(x => x.id === row.id && x.property_name === 'Property');
            if (!t) return prev;

            sb.from('reports')
              .select('id, selected_month, selected_year, properties(name)')
              .eq('id', row.id)
              .single()
              .then(({ data }) => {
                if (!data) return;
                const d = data as any;
                setToasts(p => p.map(x =>
                  x.id === d.id
                    ? { ...x, property_name: d.properties?.name || 'Unknown Property', report_month: fmtMonth(d.selected_month, d.selected_year) }
                    : x
                ));
              });

            return prev;
          });
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [userId, sb]);

  // ═══════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════
  const setMode = useCallback((id: string, mode: ViewMode) =>
    setViewModes(prev => ({ ...prev, [id]: mode })), []);

  const getMode = useCallback((id: string): ViewMode =>
    viewModes[id] || 'expanded', [viewModes]);

  const dismissToast = useCallback(async (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    setViewModes(prev => { const n = { ...prev }; delete n[id]; return n; });
    await sb.from('reports')
      .update({ toast_dismissed_at: new Date().toISOString() }).eq('id', id);
  }, [sb]);

  const dismissAll = useCallback(async () => {
    const ids = toasts.map(t => t.id);
    setToasts([]); setViewModes({});
    if (ids.length) await sb.from('reports')
      .update({ toast_dismissed_at: new Date().toISOString() }).in('id', ids);
  }, [toasts, sb]);

  const viewReport = useCallback((id: string) =>
    router.push(`/dashboard/reports/${id}`), [router]);

  // Hide toast for the report currently being viewed
  const curId = pathname?.match(/\/reports\/([a-f0-9-]+)/)?.[1];
  const visible = toasts.filter(t => t.id !== curId);
  if (!visible.length) return null;

  const minimized = visible.filter(t => getMode(t.id) === 'minimized');
  const cards = visible.filter(t => getMode(t.id) !== 'minimized');
  const gCnt = visible.filter(t => t.toast_status === 'generating').length;
  const dCnt = visible.filter(t => t.toast_status === 'completed').length;

  return (
    <>
      {minimized.length > 0 && (
        <div className="gen-toast-pills-row" style={{ position: 'fixed', top: 16, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'row-reverse' as const, gap: 8 }}>
          {minimized.map(t => t.toast_status === 'generating'
            ? <MinGenPill key={t.id} item={t} onExpand={() => setMode(t.id, 'expanded')} />
            : <MinDonePill key={t.id} item={t} onExpand={() => setMode(t.id, 'expanded')} onDismiss={() => dismissToast(t.id)} />
          )}
        </div>
      )}

      {cards.length > 0 && (
        <div className="gen-toast-card-stack" style={{
          position: 'fixed', top: minimized.length > 0 ? 68 : 16, right: 20, zIndex: 9998,
          display: 'flex', flexDirection: 'column' as const, gap: 7,
          maxHeight: `calc(100vh - ${minimized.length > 0 ? 130 : 80}px)`,
          overflowY: 'auto' as const, paddingBottom: 8,
          transition: 'top 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {visible.length >= 2 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3px' }}>
              <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: C.textSoft }}>
                {gCnt > 0 && dCnt > 0 ? `${gCnt} generating · ${dCnt} complete` : gCnt > 0 ? `${gCnt} generating` : `${dCnt} complete`}
              </span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => { const a: Record<string, ViewMode> = {}; visible.forEach(t => a[t.id] = 'minimized'); setViewModes(a); }}
                  style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Minimize all</button>
                <span style={{ color: C.border }}>·</span>
                <button onClick={dismissAll} style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
              </div>
            </div>
          )}
          {cards.map(t => {
            const m = getMode(t.id);
            if (t.toast_status === 'generating') return m === 'compact'
              ? <GenCompact key={t.id} item={t} onExpand={() => setMode(t.id, 'expanded')} onMinimize={() => setMode(t.id, 'minimized')} />
              : <GenExpanded key={t.id} item={t} onCompact={() => setMode(t.id, 'compact')} onMinimize={() => setMode(t.id, 'minimized')} />;
            return m === 'compact'
              ? <DoneCompact key={t.id} item={t} onDismiss={() => dismissToast(t.id)} onExpand={() => setMode(t.id, 'expanded')} onMinimize={() => setMode(t.id, 'minimized')} onView={() => viewReport(t.id)} />
              : <DoneExpanded key={t.id} item={t} onDismiss={() => dismissToast(t.id)} onCompact={() => setMode(t.id, 'compact')} onMinimize={() => setMode(t.id, 'minimized')} onView={() => viewReport(t.id)} />;
          })}
        </div>
      )}
    </>
  );
}
