/*
 * WRITEUP AI — Landing Page v4
 * ================================
 * SCREENSHOT MAP (place in /public/screenshots/):
 *   dashboard.png   → Dashboard overview (KPI cards, recent reports)
 *   properties.png  → Properties page (property cards, unit counts)
 *   reports.png     → Reports page (status filters, report grid)
 *   reports-sent.png→ Reports filtered by "Sent" (grouped by month)
 *   settings.png    → Settings (company info, logo upload)
 *   branding.png    → Branding (color palette dropdown, live preview)
 *   sections.png    → Section builder (drag to reorder, toggle)
 *   upload.png      → Report generation upload step
 *   notes.png       → Guided questions / freeform notes
 *   edit.png        → Report edit (KPIs, exec summary, regenerate)
 *
 * PERFORMANCE:
 *   - next/image for all screenshots (automatic WebP, lazy loading, srcset)
 *   - Font preconnect in <head> via metadata export
 *   - CSS-only hover/focus states (no JS listeners for cosmetics)
 *   - IntersectionObserver for fade-in (disconnects after trigger)
 *   - Only hero mockup renders above fold; screenshots lazy load below
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  accent:    '#00B7DB',
  accentD:   '#1D98B1',
  accentDD:  '#2D7886',
  dark:      '#223033',
  darkMid:   '#2E545C',
  bg:        '#FFFFFF',
  bgAlt:     '#F7F5F1',
  bgWarm:    '#FAF9F7',
  text:      '#1A1A1A',
  textMid:   '#4A4A4A',
  textSoft:  '#7A7A7A',
  textMuted: '#A3A3A3',
  border:    '#E8E5E0',
  borderL:   '#F0EDE8',
  navy:      '#002D5F',
  red:       '#CC0000',
  green:     '#008A3E',
  gold:      '#C8B88A',
}

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════════ */
const Icons = {
  upload: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  edit: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  report: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  chart: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  shield: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  mail: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  layers: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  sliders: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  download: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  user: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  check: (c = C.green) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (c = C.red) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  minus: (c = '#D4A043') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  folder: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  palette: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.37-.65-.37-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.36-8.92-10-8.92z"/></svg>,
  grid: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  home: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  send: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function FadeIn({ children, delay = 0, className = '', style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.08, rootMargin: '40px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`, ...style }}>{children}</div>
  )
}

function AnimNum({ end, suffix = '', dur = 2200 }: { end: number; suffix?: string; dur?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const t0 = performance.now()
        const tick = (now: number) => { const p = Math.min((now - t0) / dur, 1); setVal(Math.round((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [end, dur])
  return <span ref={ref}>{val}{suffix}</span>
}

const Section = ({ children, bg = C.bg, id, style = {} }: { children: React.ReactNode; bg?: string; id?: string; style?: React.CSSProperties }) => (
  <section id={id} style={{ background: bg, padding: '96px 24px', position: 'relative', ...style }}><div style={{ maxWidth: 1120, margin: '0 auto' }}>{children}</div></section>
)
const Tag = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '5px 14px', background: `${C.accent}0D`, border: `1px solid ${C.accent}22`, borderRadius: 100, fontSize: 12, fontWeight: 600, color: C.accent, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent }} />{children}</div>
)
const H1 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 500, lineHeight: 1.12, color: C.text, margin: 0, letterSpacing: '-0.02em', ...style }}>{children}</h1>
const H2 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 500, lineHeight: 1.15, color: C.text, margin: 0, letterSpacing: '-0.015em', ...style }}>{children}</h2>
const H3 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 500, lineHeight: 1.25, color: C.text, margin: 0, ...style }}>{children}</h3>
const P = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <p style={{ fontFamily: 'DM Sans', fontSize: 16, lineHeight: 1.7, color: C.textMid, margin: 0, ...style }}>{children}</p>
const Btn = ({ children, href = '#', primary = true, style = {} }: { children: React.ReactNode; href?: string; primary?: boolean; style?: React.CSSProperties }) => (
  <a href={href} className={primary ? 'btn-primary' : 'btn-secondary'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, textDecoration: 'none', padding: '13px 28px', borderRadius: 10, color: primary ? '#fff' : C.text, background: primary ? C.accent : 'transparent', border: primary ? 'none' : `1.5px solid ${C.border}`, transition: 'all 0.25s', boxShadow: primary ? `0 2px 12px ${C.accent}30` : 'none', ...style }}>{children}</a>
)

/* ═══════════════════════════════════════════════════════════════
   BROWSER FRAME — wraps screenshots for polish
   ═══════════════════════════════════════════════════════════════ */
function BrowserFrame({ children, url = 'app.writeup-ai.com' }: { children: React.ReactNode; url?: string }) {
  return (
    <div style={{ background: C.bgAlt, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '8px 14px', background: C.bgWarm, borderBottom: `1px solid ${C.borderL}`, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, marginLeft: 10, background: C.bgAlt, borderRadius: 6, padding: '5px 14px', fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>{url}</div>
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REPORT MOCKUP DATA & COMPONENTS (JLL/CBRE style)
   ═══════════════════════════════════════════════════════════════ */
const MONTHS_SHORT = ['Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov']
const T12_NOI = [72891,85234,78456,91023,88567,95234,102371,89456,84321,79876,90516,113848]
const T12_NOI_BUD = [81000,83500,82000,84000,85500,86000,87500,88000,88500,89000,90000,91000]
const OCC = [94.2,95.1,94.8,93.9,93.5,94.0,93.2,92.8,92.5,92.3,92.3,91.4]
const OCC_BUD = [95.0,95.0,95.0,95.0,95.0,95.0,95.0,95.0,94.5,94.5,94.0,94.0]
const EXPENSE_CATS = [
  { name: 'Property Taxes', actual: 46244, budget: 62892 },
  { name: 'Payroll & Related', actual: 35072, budget: 34500 },
  { name: 'Property Insurance', actual: 18429, budget: 18400 },
  { name: 'Contract Services', actual: 17960, budget: 16800 },
  { name: 'Utilities', actual: 13216, budget: 11500 },
  { name: 'Management Fee', actual: 8910, budget: 8900 },
]
const fmtK = (v: number) => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'K' : '$' + v
const fmtFull = (v: number) => '$' + v.toLocaleString()
const pts = (data: number[], w: number, h: number, pad: number, min: number, max: number) => data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: pad + ((max - v) / (max - min)) * (h - pad * 2) }))
const pl = (p: { x: number; y: number }[]) => p.map(pt => `${pt.x},${pt.y}`).join(' ')

function ReportHeader() {
  return (
    <div style={{ borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
      <div style={{ background: C.navy, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, fontFamily: 'DM Sans' }}>Asset Performance Report</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginTop: 2, fontFamily: 'DM Sans' }}>Oakmont Ridge Apartments · 234 Units</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'DM Sans' }}>November 2025</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans' }}>San Antonio, TX · Class B Value-Add</div>
        </div>
      </div>
      <div className="report-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: `3px solid ${C.red}`, background: '#fff' }}>
        {[
          { label: 'NOI', value: '$113,848', delta: '+25.8%', up: true },
          { label: 'Revenue', value: '$277,826', delta: '\u20131.2%', up: false },
          { label: 'Physical Occ.', value: '91.4%', delta: '\u201390 bps', up: false },
          { label: 'Economic Occ.', value: '80.0%', delta: '\u201370 bps', up: false },
          { label: 'NOI Margin', value: '41.0%', delta: '+880 bps', up: true },
        ].map((m, i) => (
          <div key={i} style={{ padding: '12px 13px', borderRight: i < 4 ? '1px solid #EDEDED' : 'none' }}>
            <div style={{ fontSize: 8, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 3, fontFamily: 'DM Sans' }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: m.up ? C.green : C.red, marginTop: 2, fontFamily: 'DM Sans' }}>{m.delta} MoM</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BudgetVarianceTable() {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 1, fontFamily: 'DM Sans' }}>Budget vs. Actual — Operating Expenses</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 10, fontFamily: 'DM Sans' }}>November 2025</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans' }}>
        <thead><tr style={{ borderBottom: `2px solid ${C.navy}` }}>
          {['Category','Actual','Budget','Var ($)',''].map((h,i) => <th key={i} style={{ textAlign: i===0?'left':'right', padding: '5px 5px', fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {EXPENSE_CATS.map((item,i) => { const v = item.budget - item.actual; const fav = v >= 0; return (
            <tr key={i} style={{ borderBottom: '1px solid #F3F3F3' }}>
              <td style={{ padding: '6px 5px', fontSize: 10, color: '#444', fontWeight: 500 }}>{item.name}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(item.actual)}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, color: '#999', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(item.budget)}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: fav ? C.green : C.red, fontVariantNumeric: 'tabular-nums' }}>{fav ? '' : '('}${Math.abs(v).toLocaleString()}{fav ? '' : ')'}</td>
              <td style={{ padding: '6px 5px', width: 45 }}><div style={{ display: 'flex', justifyContent: fav ? 'flex-start' : 'flex-end' }}><div style={{ height: 4, width: `${Math.min(Math.abs(v)/18000*100,100)}%`, minWidth: 2, borderRadius: 2, background: fav ? C.green : C.red, opacity: 0.5 }} /></div></td>
            </tr>) })}
          <tr style={{ borderTop: `2px solid ${C.navy}`, background: '#F9F9F9' }}>
            <td style={{ padding: '6px 5px', fontSize: 10, fontWeight: 700, color: C.navy }}>Total OpEx</td>
            <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.navy }}>$163,978</td>
            <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#999' }}>$171,492</td>
            <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.green }}>$7,514</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function OccupancyChart() {
  const w = 300, h = 120, pad = 28, min = 88, max = 97
  const pA = pts(OCC, w, h, pad, min, max), pB = pts(OCC_BUD, w, h, pad, min, max)
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>Physical Occupancy — Actual vs. Budget</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 8, fontFamily: 'DM Sans' }}>T-12</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {[90,92,94,96].map((v,i) => { const y = pad + ((max-v)/(max-min))*(h-pad*2); return <g key={i}><line x1={pad} y1={y} x2={w-pad} y2={y} stroke="#F0F0F0" /><text x={pad-4} y={y+3} textAnchor="end" fontSize="7" fill="#CCC" fontFamily="DM Sans">{v}%</text></g> })}
        <polyline points={pl(pB)} fill="none" stroke={C.red} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.3" />
        <polyline points={pl(pA)} fill="none" stroke={C.navy} strokeWidth="2" strokeLinejoin="round" />
        {pA.map((p,i) => <g key={i}><circle cx={p.x} cy={p.y} r={i===11?3:1.8} fill={i===11?C.red:C.navy} stroke="#fff" strokeWidth="1" /><text x={p.x} y={h-3} textAnchor="middle" fontSize="6" fill="#BBB" fontFamily="DM Sans">{MONTHS_SHORT[i]}</text></g>)}
      </svg>
    </div>
  )
}

function NOIChart() {
  const w = 300, h = 120, pad = 28, min = 60000, max = 120000
  const pB = pts(T12_NOI_BUD, w, h, pad, min, max)
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>NOI — Actual vs. Budget</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 8, fontFamily: 'DM Sans' }}>Monthly T-12</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {[70000,85000,100000,115000].map((v,i) => { const y = pad + ((max-v)/(max-min))*(h-pad*2); return <g key={i}><line x1={pad} y1={y} x2={w-pad} y2={y} stroke="#F0F0F0" /><text x={pad-4} y={y+3} textAnchor="end" fontSize="7" fill="#CCC" fontFamily="DM Sans">${(v/1000)}K</text></g> })}
        {T12_NOI.map((v,i) => { const bw = (w-pad*2)/12*0.5; const x = pad + (i/11)*(w-pad*2) - bw/2; const bh = ((v-min)/(max-min))*(h-pad*2); const over = v > T12_NOI_BUD[i]; return <rect key={i} x={x} y={h-pad-bh} width={bw} height={bh} fill={over?C.navy:C.red} opacity={i===11?0.85:over?0.35:0.25} rx="2" /> })}
        <polyline points={pl(pB)} fill="none" stroke={C.red} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.45" />
        {MONTHS_SHORT.map((m,i) => <text key={i} x={pad + (i/11)*(w-pad*2)} y={h-3} textAnchor="middle" fontSize="6" fill="#BBB" fontFamily="DM Sans">{m}</text>)}
      </svg>
    </div>
  )
}

function RevenueWaterfall() {
  const items = [
    { label: 'GPR', val: 280333, base: 0, color: C.navy, neg: false },
    { label: 'Vacancy', val: 22476, base: 257857, color: C.red, neg: true },
    { label: 'LTL', val: 20724, base: 237133, color: C.red, neg: true },
    { label: 'Bad Debt', val: 7703, base: 229430, color: C.red, neg: true },
    { label: 'Net Rent', val: 224323, base: 0, color: C.green, neg: false },
    { label: 'Other', val: 53503, base: 0, color: C.accent, neg: false },
    { label: 'Total Rev.', val: 277826, base: 0, color: C.navy, neg: false },
  ]
  const mx = 295000
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>Revenue Waterfall — GPR to Total Revenue</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 12, fontFamily: 'DM Sans' }}>November 2025</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130, paddingBottom: 22, position: 'relative' }}>
        {items.map((item,i) => { const bH = Math.max((item.val/mx)*105, 4); const bot = 22 + (item.base/mx)*105; return (
          <div key={i} style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div style={{ position: 'absolute', bottom: bot, width: '76%', left: '12%', height: bH, background: item.color, borderRadius: 1.5, opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 5, width: '100%', textAlign: 'center', fontSize: 6.5, color: '#999', fontFamily: 'DM Sans' }}>{item.label}</div>
            <div style={{ position: 'absolute', bottom: bot + bH + 2, width: '100%', textAlign: 'center', fontSize: 7, fontWeight: 600, color: item.neg ? C.red : item.color, fontFamily: 'DM Sans' }}>{item.neg ? '\u2013' : ''}{fmtK(item.val)}</div>
          </div>) })}
      </div>
    </div>
  )
}

function NarrativeSection() {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontFamily: 'DM Sans' }}>Executive Summary</div>
      <div style={{ fontSize: 11, color: '#555', lineHeight: 1.75, fontFamily: 'DM Sans' }}>
        <span style={{ color: C.text, fontWeight: 500 }}>Oakmont Ridge Apartments delivered $113,848 in Net Operating Income for November 2025</span>, representing a 25.8% increase month-over-month and a $22,848 favorable variance to the $91,000 underwriting target. The improvement was driven by a $7,514 reduction in total operating expenses, with property tax reassessment savings of $16,648 offsetting modest overruns in utilities and contract services.
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SCREENSHOT SHOWCASE — Tabbed Platform Tour (next/image)
   ═══════════════════════════════════════════════════════════════ */
const platformTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.home, img: '/screenshots/dashboard.png', caption: 'Portfolio overview with KPI cards, recent reports, and quick actions at a glance.' },
  { id: 'properties', label: 'Properties', icon: Icons.grid, img: '/screenshots/properties.png', caption: 'Manage your portfolio. Each card shows unit count, last report date, and status.' },
  { id: 'reports', label: 'Reports', icon: Icons.report, img: '/screenshots/reports.png', caption: 'All your investor reports in one place. Filter by status and search by property.' },
  { id: 'branding', label: 'Branding', icon: Icons.palette, img: '/screenshots/branding.png', caption: 'Preset color palettes or custom brand colors with real-time preview.' },
  { id: 'sections', label: 'Sections', icon: Icons.sliders, img: '/screenshots/sections.png', caption: 'Add, remove, and reorder report sections with drag-and-drop.' },
  { id: 'tracking', label: 'Tracking', icon: Icons.send, img: '/screenshots/reports-sent.png', caption: 'Mark reports as sent and track delivery status, grouped by period.' },
]

function ScreenshotShowcase() {
  const [active, setActive] = useState(0)
  return (
    <div>
      {/* Tab bar */}
      <div className="showcase-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 32, flexWrap: 'wrap' }}>
        {platformTabs.map((tab, i) => (
          <button key={tab.id} onClick={() => setActive(i)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'DM Sans', fontSize: 13, fontWeight: active === i ? 600 : 500, color: active === i ? C.accent : C.textSoft, background: active === i ? `${C.accent}0D` : 'transparent', border: `1px solid ${active === i ? C.accent + '30' : 'transparent'}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', transition: 'all 0.25s' }}>
            <span className="tab-icon" style={{ opacity: active === i ? 1 : 0.5 }}>{tab.icon(active === i ? C.accent : C.textSoft)}</span>
            {tab.label}
          </button>
        ))}
      </div>
      {/* Browser frame + screenshots */}
      <BrowserFrame>
        <div style={{ position: 'relative', background: '#fff', minHeight: 300 }}>
          {platformTabs.map((tab, i) => (
            <div key={tab.id} style={{ position: (i === active ? 'relative' : 'absolute') as 'relative' | 'absolute', top: 0, left: 0, width: '100%', opacity: i === active ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: (i === active ? 'auto' : 'none') as 'auto' | 'none' }}>
              <Image src={tab.img} alt={tab.label} width={1120} height={700} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" quality={85} />
            </div>
          ))}
        </div>
      </BrowserFrame>
      {/* Caption */}
      <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'DM Sans', fontSize: 14, color: C.textMid, maxWidth: 520, margin: '20px auto 0', minHeight: 44 }}>{platformTabs[active].caption}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FLIP CARD — Section Showcase
   ═══════════════════════════════════════════════════════════════ */
function FlipCard({ title, tier, description, icon }: { title: string; tier: string; description: string; icon: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false)
  const tierColor = tier === 'Foundational' ? C.textSoft : tier === 'Professional' ? C.accent : C.navy
  return (
    <div onClick={() => setFlipped(!flipped)} style={{ perspective: 600, cursor: 'pointer', height: 160 }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div><div style={{ marginBottom: 10 }}>{icon}</div><div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{title}</div></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, color: tierColor, background: `${tierColor}10`, padding: '3px 8px', borderRadius: 4 }}>{tier}</span>
            <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: C.textMuted }}>Tap to learn more</span>
          </div>
        </div>
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: C.bgAlt, border: `1px solid ${C.accent}25`, borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: C.textMid, lineHeight: 1.65, overflow: 'hidden' }}>{description}</div>
          <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: C.accent, fontWeight: 600, marginTop: 6 }}>Tap to flip back</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════ */
function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: open === i ? C.bgWarm : C.bg, border: `1px solid ${open === i ? C.accent + '30' : C.border}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.3s' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, color: C.text, textAlign: 'left', gap: 16 }}>
            <span>{item.q}</span>
            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: open === i ? `${C.accent}15` : '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: open === i ? C.accent : C.textSoft, transition: 'all 0.3s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
          </button>
          <div style={{ maxHeight: open === i ? 500 : 0, overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ padding: '0 20px 16px', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.7, color: C.textMid }}>{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function WriteUpLanding() {
  const { isSignedIn } = useAuth()
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const navSolid = scrollY > 50
  const dashboardHref = isSignedIn ? '/dashboard' : '/sign-up'
  const ctaLabel = isSignedIn ? 'Go to Dashboard' : 'Generate a Free Report'

  /* ── Section card data ── */
  const sectionCards = [
    { title: 'Executive Summary', tier: 'Foundational', desc: 'High-level performance overview with KPI cards showing NOI, revenue, occupancy, and expenses at a glance. The 30-second scan your LP reads first.', icon: Icons.report(C.textSoft) },
    { title: 'Revenue Summary', tier: 'Foundational', desc: 'Top-line revenue breakdown including effective rent, rental income, and other income sources. KPI cards highlight MoM changes and budget variances.', icon: Icons.chart(C.textSoft) },
    { title: 'Expense Summary', tier: 'Foundational', desc: 'Total operating expenses by category with variances. Identifies where you are over or under budget and flags the line items that matter.', icon: Icons.chart(C.textSoft) },
    { title: 'Asset Manager Outlook', tier: 'Foundational', desc: 'Forward-looking narrative drawn from your notes and questionnaire responses. Your voice, your strategy, your outlook — written at institutional quality.', icon: Icons.edit(C.textSoft) },
    { title: 'Occupancy & Leasing', tier: 'Professional', desc: 'Occupancy gauge chart, move-in/move-out breakdown, leasing velocity metrics. Physical and economic occupancy tracked with trend analysis.', icon: Icons.chart(C.accent) },
    { title: 'Revenue Analysis', tier: 'Professional', desc: 'Revenue waterfall from GPR to EGI with loss to lease, concessions, bad debt, and other income. Visual decomposition of every dollar.', icon: Icons.chart(C.accent) },
    { title: 'Expense Analysis', tier: 'Professional', desc: 'Category-level expense breakdown with budget variance bars. Green for favorable, red for unfavorable. Inline deviation charts per line item.', icon: Icons.chart(C.accent) },
    { title: 'NOI Performance', tier: 'Professional', desc: 'NOI comparison: current month vs. prior month vs. budget. Trend bars color-coded by budget beat or miss across the trailing 12 months.', icon: Icons.chart(C.accent) },
    { title: 'Rent Roll Insights', tier: 'Professional', desc: 'Unit mix table, average rent by floorplan, vacancy detail. Parsed directly from your rent roll upload with floorplan-level granularity.', icon: Icons.layers(C.accent) },
    { title: 'Risk & Watch Items', tier: 'Professional', desc: 'Data-driven risk flags with severity ratings. Auto-generated from your financials — delinquency spikes, expense overruns, occupancy drops.', icon: Icons.shield(C.accent) },
    { title: 'Investment Thesis Update', tier: 'Institutional', desc: 'Tracks property performance against your original investment strategy. Value-add repositioning progress, stabilization timeline, thesis validation.', icon: Icons.report(C.navy) },
    { title: 'Lease Expiration & Rollover', tier: 'Institutional', desc: '12-month lease expiration bar chart with revenue-at-risk calculations. Shows exactly when leases roll and the financial exposure at each period.', icon: Icons.chart(C.navy) },
    { title: 'Budget vs. Actual', tier: 'Institutional', desc: 'Comprehensive variance analysis with visual charts. Requires budget CSV upload — upload once per property, reused across every report automatically.', icon: Icons.chart(C.navy) },
    { title: 'Risk Matrix', tier: 'Institutional', desc: 'Severity-rated risk table with trend arrows. Categorized by financial, operational, and market risk. The format pension funds and sovereign wealth funds expect.', icon: Icons.shield(C.navy) },
    { title: 'Strategic Outlook', tier: 'Institutional', desc: 'Comprehensive 30/60/90-day action plan with specific milestones. Lease-up targets, capex timelines, revenue goals, and operational priorities.', icon: Icons.sliders(C.navy) },
  ]

  /* ── FAQ data ── */
  const faqItems = [
    { q: 'How is this different from pasting my T-12 into ChatGPT?', a: 'ChatGPT gives you a paragraph. WriteUp AI gives you a multi-section branded investor report with revenue waterfall charts, expense variance bars, occupancy gauges, KPI cards with MoM comparisons, your firm\'s logo and colors, and a PDF that renders identically across browsers. It does not parse your T-12 line by line, calculate real variances against your budget, or enforce the NOI ceiling rule.' },
    { q: 'Will my investors know this was generated by AI?', a: 'No. Reports carry your firm\'s logo, your brand colors, and your custom disclaimer. There are no AI watermarks or badges. Every section is reviewed and edited before export. This is a drafting tool with human approval built into the workflow.' },
    { q: 'Does the AI make up numbers?', a: 'The AI does not guess at numbers. It parses your uploaded T-12 line by line, column by column, and extracts exact values from your data. No report leaves the platform without your review. You see the KPI cards, the charts, the narrative. You approve every number before export.' },
    { q: 'Can I edit the report before sending it?', a: 'Every section is independently editable. Change a word, rewrite a paragraph, or adjust a number without touching the other sections. You can also regenerate individual sections with custom instructions — or edit them manually. The AI proposes. You dispose.' },
    { q: 'What happens to my data?', a: 'Your data is encrypted in transit and at rest, stored in an isolated database with row-level security. It is not shared with other users, not used to train AI models, and not accessible for any purpose other than generating your reports.' },
    { q: 'We only report quarterly. Is it still worth it?', a: 'The reason most firms report quarterly is because monthly reporting takes too long. When each report takes 5 minutes instead of 5 hours, monthly becomes feasible. Firms that switch to monthly reporting see measurable improvements in LP confidence, retention, and capital re-up rates.' },
    { q: 'What if I cancel?', a: 'Every report is exportable as PDF and HTML — standalone files that work forever. Your uploaded data can be downloaded at any time. You are never locked into a proprietary format.' },
  ]

  /* ── Nav items (reused in desktop + mobile) ── */
  const navItems = [
    { t: 'How It Works', h: '#how-it-works' },
    { t: 'The Report', h: '#report-preview' },
    { t: 'Compare', h: '#compare' },
    { t: 'Platform', h: '#platform' },
    { t: 'Pricing', h: '#pricing' },
    { t: 'FAQ', h: '#faq' },
  ]

  /* ── How It Works steps ── */
  const howSteps = [
    { n: '01', title: 'Upload your financials', desc: 'Drop in your T-12, rent roll, leasing activity report, budget CSV, and any supporting documents. The platform parses every line item, every column, every month.', icon: Icons.upload(C.accent), img: '/screenshots/upload.png' },
    { n: '02', title: 'Give us the context', desc: 'Paste your property notes directly, or answer guided questions designed so you do not miss a detail — investment strategy, occupancy updates, capital progress, and forward outlook.', icon: Icons.edit(C.accent), img: '/screenshots/notes.png' },
    { n: '03', title: 'Review, edit, and export', desc: 'A complete, branded, chart-filled investor report generates in minutes. Review every section, edit manually or regenerate with AI instructions, then export as PDF, HTML, or email-ready HTML.', icon: Icons.report(C.accent), img: '/screenshots/edit.png' },
  ]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Font preconnect + load */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap" rel="stylesheet" />

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        ::selection{background:${C.accent}25;color:${C.text}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .hover-lift{transition:transform 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s}
        .hover-lift:hover{transform:translateY(-3px);box-shadow:0 10px 36px rgba(0,0,0,0.06)}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 24px ${C.accent}35!important}
        .btn-secondary:hover{border-color:${C.accent}50!important;background:${C.accent}06!important}

        /* ── TABLET (≤ 900px) ── */
        @media(max-width:900px){
          .hero-grid{flex-direction:column!important}
          .hero-mockup{max-width:100%!important}
          .grid-2{grid-template-columns:1fr!important}
          .grid-3{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
          .mobile-toggle{display:flex!important}
          .hero-ctas{flex-direction:column!important;align-items:stretch!important}
          .hero-ctas a{text-align:center;justify-content:center}
          .mockup-grid{grid-template-columns:1fr!important}
          .report-kpi-grid{grid-template-columns:repeat(3,1fr)!important}
          .compare-table{overflow-x:auto!important}
          .benefit-grid{grid-template-columns:1fr 1fr!important}
          .section-grid{grid-template-columns:repeat(2,1fr)!important}
          .pricing-grid{grid-template-columns:1fr!important;max-width:480px;margin-left:auto;margin-right:auto}
          .how-step{flex-direction:column!important}
          .how-step-reverse{flex-direction:column!important}
          .showcase-tabs{gap:2px!important}
          .showcase-tabs button{font-size:11px!important;padding:7px 10px!important}
          .showcase-tabs .tab-icon{display:none!important}
        }

        /* ── PHONE (≤ 640px) ── */
        @media(max-width:640px){
          .report-kpi-grid{grid-template-columns:repeat(2,1fr)!important}
          .benefit-grid{grid-template-columns:1fr!important}
          .section-grid{grid-template-columns:1fr!important}
          .billing-toggle{flex-direction:column!important;align-items:stretch!important}
          .billing-toggle button{justify-content:center!important}
          section{padding-left:16px!important;padding-right:16px!important}
        }

        /* ── DESKTOP ONLY ── */
        @media(min-width:901px){.mobile-toggle{display:none!important}.mobile-menu-panel{display:none!important}}
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: navSolid ? 'rgba(255,255,255,0.92)' : 'transparent', backdropFilter: navSolid ? 'blur(20px)' : 'none', WebkitBackdropFilter: navSolid ? 'blur(20px)' : 'none', borderBottom: navSolid ? `1px solid ${C.borderL}` : '1px solid transparent', transition: 'all 0.35s' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#fff' }}>W</div>
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 19, fontWeight: 500, color: C.text }}>WriteUp AI</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {navItems.map(n => <a key={n.t} href={n.h} style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: C.textMid, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = C.text} onMouseLeave={e => (e.target as HTMLElement).style.color = C.textMid}>{n.t}</a>)}
            {isSignedIn ? (
              <Link href="/dashboard" className="btn-primary" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, padding: '9px 22px', borderRadius: 8, textDecoration: 'none', transition: 'all 0.25s', boxShadow: `0 2px 10px ${C.accent}25` }}>Dashboard</Link>
            ) : (<>
              <Link href="/sign-in" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: C.textMid, textDecoration: 'none' }}>Sign In</Link>
              <Link href="/sign-up" className="btn-primary" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, padding: '9px 22px', borderRadius: 8, textDecoration: 'none', transition: 'all 0.25s', boxShadow: `0 2px 10px ${C.accent}25` }}>Start Free Trial</Link>
            </>)}
          </div>
          <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none', flexDirection: 'column', gap: 5 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 20, height: 2, background: C.text, borderRadius: 1, transition: 'all 0.3s', transform: mobileMenu ? (i===0?'rotate(45deg) translate(5px,5px)':i===1?'scaleX(0)':'rotate(-45deg) translate(5px,-5px)') : 'none', opacity: mobileMenu&&i===1?0:1 }} />)}
          </button>
        </div>
        {mobileMenu && (
          <div className="mobile-menu-panel" style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.borderL}`, padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navItems.map(n => <a key={n.t} href={n.h} onClick={() => setMobileMenu(false)} style={{ fontFamily: 'DM Sans', fontSize: 15, color: C.textMid, textDecoration: 'none', padding: '10px 0', borderBottom: `1px solid ${C.borderL}` }}>{n.t}</a>)}
            <Link href={dashboardHref} onClick={() => setMobileMenu(false)} style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'center', background: C.accent, padding: '12px', borderRadius: 8, textDecoration: 'none', marginTop: 8 }}>{ctaLabel}</Link>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <Section style={{ paddingTop: 128, paddingBottom: 40 }}>
        <div className="hero-grid" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
          <div style={{ flex: '1 1 52%' }}>
            <FadeIn><Tag>Built by an asset manager</Tag></FadeIn>
            <FadeIn delay={0.08}><H1>Investor reports that took hours.<br/><span style={{ color: C.accent }}>Done in minutes.</span></H1></FadeIn>
            <FadeIn delay={0.16}><P style={{ marginTop: 20, maxWidth: 500, fontSize: 17 }}>Upload your T-12, rent roll, and supporting documents. Give us your notes or answer guided questions so nothing gets missed. Get a branded, chart-filled, institutional-quality investor report in minutes.</P></FadeIn>
            <FadeIn delay={0.22}>
              <div className="hero-ctas" style={{ display: 'flex', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
                <Btn href={dashboardHref} primary>{ctaLabel}</Btn>
                <Btn href="#report-preview" primary={false}>See a Sample Report</Btn>
              </div>
            </FadeIn>
            <FadeIn delay={0.28}><div style={{ marginTop: 20, fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>Free tier — 2 properties — no credit card required</div></FadeIn>
          </div>
          <div className="hero-mockup" style={{ flex: '1 1 48%', maxWidth: 500 }}>
            <FadeIn delay={0.15}>
              <div style={{ background: C.bgAlt, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.07)', animation: 'float 7s ease-in-out infinite' }}>
                <ReportHeader />
                <div style={{ marginTop: 8 }}><NarrativeSection /></div>
                <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}><OccupancyChart /><NOIChart /></div>
              </div>
            </FadeIn>
          </div>
        </div>
      </Section>

      {/* ═══ STATS BAR ═══ */}
      <div style={{ borderTop: `1px solid ${C.borderL}`, borderBottom: `1px solid ${C.borderL}`, padding: '32px 24px', background: C.bgWarm }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 52, flexWrap: 'wrap' }}>
          {[{ val:5, sfx:' min', label:'Average report time' },{ val:50, sfx:':1', label:'Time savings ratio' },{ val:15, sfx:'', label:'Report sections' },{ val:8, sfx:'+', label:'Chart types' }].map((s,i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontFamily: "'Newsreader', serif", fontSize: 32, fontWeight: 500, color: C.text }}><AnimNum end={s.val} suffix={s.sfx} /></div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textSoft, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ KEY BENEFITS ═══ */}
      <Section bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Why WriteUp AI</Tag><H2>Everything your reporting<br/><em>process is missing</em></H2></div></FadeIn>
        <div className="benefit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
          {[
            { icon: Icons.folder(C.accent), title: 'Investor Report Management', desc: 'A full report management system. Organize, track, and access every report across your entire portfolio from one dashboard.' },
            { icon: Icons.mail(C.accent), title: 'Email-Ready HTML', desc: 'Copy and paste reports directly into your monthly investor emails. Charts, KPI cards, and narrative — no attachments needed.' },
            { icon: Icons.upload(C.accent), title: 'Upload Data, Give Notes, Answer Questions', desc: 'Upload your T-12, rent roll, and any supporting files. Paste your notes or answer guided questions designed so nothing gets missed.' },
            { icon: Icons.chart(C.accent), title: 'Upload Budget Once', desc: 'Upload your budget CSV once per property. Every report automatically includes budget variance analysis — no re-uploading each month.' },
            { icon: Icons.user(C.accent), title: 'Built by an Asset Manager', desc: 'The prompt engineering, section structure, and financial guardrails were built by someone who has written hundreds of investor reports manually.' },
            { icon: Icons.sliders(C.accent), title: 'Customize Your Reports', desc: 'Choose which sections to show, reorder them with drag-and-drop, enable or disable conditional sections. Your report, your way.' },
            { icon: Icons.edit(C.accent), title: 'Edit by Section — Manually or with AI', desc: "Edit any section by hand, or regenerate it with custom instructions like 'focus on the occupancy improvement' or 'make this more conservative.'" },
            { icon: Icons.download(C.accent), title: 'Export as PDF, HTML, or Email', desc: 'Server-side PDF rendering for pixel-perfect output. Standalone HTML files. One-click copy for email — paste into Gmail, Outlook, or Apple Mail.' },
            { icon: Icons.shield(C.accent), title: 'The NOI Ceiling Rule', desc: 'All analysis stops at Net Operating Income. The AI never touches debt service, distributions, or below-the-line items unless you explicitly provide that data.' },
          ].map((b,i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="hover-lift" style={{ background: C.bgAlt, border: `1px solid ${C.borderL}`, borderRadius: 14, padding: '22px 20px', height: '100%', cursor: 'default' }}>
                <div style={{ marginBottom: 12 }}>{b.icon}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{b.title}</div>
                <P style={{ fontSize: 13.5 }}>{b.desc}</P>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ═══ HOW IT WORKS — alternating layout with real screenshots ═══ */}
      <Section id="how-it-works" bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}><Tag>How It Works</Tag><H2>From approved financials to<br/><em>investor-ready</em> in three steps</H2></div></FadeIn>
        <div style={{ marginTop: 48 }}>
          {howSteps.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className={i % 2 === 1 ? 'how-step how-step-reverse' : 'how-step'} style={{ display: 'flex', gap: 40, alignItems: 'center', marginBottom: i < 2 ? 48 : 0, flexDirection: i % 2 === 1 ? 'row-reverse' : 'row' }}>
                <div style={{ flex: '1 1 40%', minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.accent}0D`, border: `1px solid ${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                    <div style={{ fontFamily: "'Newsreader', serif", fontSize: 16, fontWeight: 500, color: C.accent }}>{s.n}</div>
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.title}</div>
                  <P style={{ fontSize: 15 }}>{s.desc}</P>
                </div>
                <div style={{ flex: '1 1 60%' }}>
                  <BrowserFrame>
                    <Image src={s.img} alt={s.title} width={1120} height={700} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" quality={85} />
                  </BrowserFrame>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ═══ REPORT PREVIEW ═══ */}
      <Section id="report-preview" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>See the Report</Tag><H2>This is what your investors<br/>will actually receive</H2><P style={{ marginTop: 14 }}>Real data. Real charts. Real financial analysis. Every element below is generated by WriteUp AI from a single T-12 upload.</P></div></FadeIn>
        <FadeIn delay={0.1}>
          <div style={{ marginTop: 44, background: C.bgAlt, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.06)' }}>
            <ReportHeader />
            <div style={{ marginTop: 12 }}><NarrativeSection /></div>
            <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}><RevenueWaterfall /><BudgetVarianceTable /></div>
            <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}><OccupancyChart /><NOIChart /></div>
            <div style={{ marginTop: 14, textAlign: 'center', fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, padding: '10px 0', borderTop: `1px solid ${C.borderL}` }}>Sample report generated by WriteUp AI · Your reports carry your brand, not ours</div>
          </div>
        </FadeIn>
      </Section>

      {/* ═══ COMPARISON TABLE ═══ */}
      <Section id="compare" bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto' }}><Tag>Compare</Tag><H2>Why asset managers switch<br/><em>from what they are using today</em></H2></div></FadeIn>
        <FadeIn delay={0.1}>
          <div className="compare-table" style={{ marginTop: 44, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'DM Sans', minWidth: 700 }}>
              <thead><tr>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: C.textSoft, background: C.bgAlt, borderBottom: `2px solid ${C.border}`, width: '28%' }}>Feature</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: C.accent, borderRadius: '10px 10px 0 0', borderBottom: 'none', width: '24%' }}>WriteUp AI</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.textSoft, background: C.bgAlt, borderBottom: `2px solid ${C.border}`, width: '24%' }}>ChatGPT / Generic AI</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.textSoft, background: C.bgAlt, borderBottom: `2px solid ${C.border}`, width: '24%' }}>Manual (Word + Excel)</th>
              </tr></thead>
              <tbody>
                {[
                  { feature: 'T-12 line-by-line parsing', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'Revenue waterfall & variance charts', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'KPI cards with MoM changes', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'Your brand colors, logo & disclaimer', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'NOI ceiling rule (financial guardrails)', wu: 'check', gpt: 'x', manual: 'check' },
                  { feature: 'Correct CRE terminology (GPR, EGI, LTL)', wu: 'check', gpt: 'x', manual: 'check' },
                  { feature: 'Section-level editing & regeneration', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'Budget variance (upload once)', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'PDF export (cross-browser)', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'Email-ready HTML (copy & paste)', wu: 'check', gpt: 'x', manual: 'x' },
                  { feature: 'Consistent format across 20+ properties', wu: 'check', gpt: 'x', manual: 'x' },
                  { feature: 'Time per property', wu: '5 min', gpt: '30 min + rework', manual: '4\u20138 hours' },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.bg : C.bgWarm }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: C.text, borderBottom: `1px solid ${C.borderL}` }}>{row.feature}</td>
                    {(['wu','gpt','manual'] as const).map((col, ci) => {
                      const val = row[col]; const isWU = col === 'wu'
                      return (
                        <td key={ci} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderL}`, background: isWU ? `${C.accent}04` : 'transparent', borderLeft: isWU ? `1px solid ${C.accent}15` : 'none', borderRight: isWU ? `1px solid ${C.accent}15` : 'none' }}>
                          {val === 'check' ? Icons.check() : val === 'x' ? Icons.x() : val === 'minus' ? Icons.minus() :
                            <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: isWU ? 700 : 500, color: isWU ? C.accent : C.textSoft }}>{val}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </Section>

      {/* ═══ PLATFORM SHOWCASE (Real Screenshots) ═══ */}
      <Section id="platform" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>The Platform</Tag><H2>More than a report generator.<br/><em>A report management system.</em></H2><P style={{ marginTop: 14 }}>Organize, track, edit, and export every investor report across your entire portfolio — from one dashboard.</P></div></FadeIn>
        <FadeIn delay={0.1}><div style={{ marginTop: 48 }}><ScreenshotShowcase /></div></FadeIn>
      </Section>

      {/* ═══ SECTION SHOWCASE (Flip Cards) ═══ */}
      <Section bg={C.bgAlt}>
        <FadeIn>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <Tag>Report Sections</Tag><H2>Up to 15 sections,<br/><em>each purpose-built</em></H2>
            <P style={{ marginTop: 14 }}>Every section is designed for a specific analytical purpose. Tap any card to see what it delivers.</P>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
              {[{ label:'Foundational', color:C.textSoft },{ label:'Professional', color:C.accent },{ label:'Institutional', color:C.navy }].map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans', fontSize: 12, color: t.color, fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, opacity: 0.7 }} />{t.label}</div>
              ))}
            </div>
          </div>
        </FadeIn>
        <div className="section-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 40 }}>
          {sectionCards.map((s,i) => <FadeIn key={i} delay={i * 0.03}><FlipCard title={s.title} tier={s.tier} description={s.desc} icon={s.icon} /></FadeIn>)}
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" bg={C.bg}>
        <FadeIn>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
            <Tag>Pricing</Tag>
            <H2>Per-property pricing.<br/><em>No hidden fees.</em></H2>
            <P style={{ marginTop: 14, maxWidth: 500, margin: '14px auto 0' }}>Pick your tier, choose your billing cycle, and pay only for the properties you manage. Every plan includes full export, branding, and your first 2 properties free.</P>
          </div>
        </FadeIn>

        {/* Billing cycle toggle */}
        <FadeIn delay={0.08}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36, marginBottom: 44 }}>
            <div className="billing-toggle" style={{ display: 'inline-flex', background: C.bgAlt, borderRadius: 10, border: `1px solid ${C.borderL}`, padding: 4 }}>
              {([
                { key: 'monthly' as const, label: 'Monthly' },
                { key: 'quarterly' as const, label: 'Quarterly', badge: 'Save 8%' },
                { key: 'yearly' as const, label: 'Yearly', badge: 'Save 17%' },
              ]).map(opt => (
                <button key={opt.key} onClick={() => setBillingCycle(opt.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans', fontSize: 14, fontWeight: billingCycle === opt.key ? 600 : 500, color: billingCycle === opt.key ? C.text : C.textSoft, background: billingCycle === opt.key ? '#fff' : 'transparent', border: billingCycle === opt.key ? `1px solid ${C.borderL}` : '1px solid transparent', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', transition: 'all 0.25s', boxShadow: billingCycle === opt.key ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
                  {opt.label}
                  {opt.badge && <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: billingCycle === opt.key ? C.accent : C.textMuted, background: billingCycle === opt.key ? `${C.accent}10` : `${C.textMuted}10`, padding: '2px 7px', borderRadius: 4 }}>{opt.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Pricing cards */}
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {([
            {
              tier: 'Foundational',
              price: { monthly: 75, quarterly: 69, yearly: 62 },
              qtrTotal: 207, yrTotal: 747,
              desc: 'Clean, branded 4-section reports with KPI cards. The professional starting point.',
              featured: false,
              color: C.textSoft,
              features: [
                '4 report sections',
                'KPI metric cards with MoM changes',
                'T-12 and rent roll parsing',
                'Budget CSV upload (once per property)',
                'Brand colors, logo, and disclaimer',
                'PDF, HTML, and email export',
                'Section-level editing and regeneration',
              ],
              limitations: [
                'No inline charts or graphs',
                'No leasing activity upload',
                'No additional document uploads',
              ],
            },
            {
              tier: 'Professional',
              price: { monthly: 299, quarterly: 275, yearly: 248 },
              qtrTotal: 825, yrTotal: 2978,
              desc: 'Data-rich reports with inline charts, waterfalls, and variance analysis. The tier investors notice.',
              featured: true,
              color: C.accent,
              features: [
                '10 report sections with inline charts',
                'Revenue waterfall and expense variance bars',
                'Occupancy gauge and NOI trend charts',
                'Rent roll insights by floorplan',
                'Risk and watch items (auto-generated)',
                'Leasing activity upload',
                'Additional supporting document uploads',
                'Everything in Foundational',
              ],
              limitations: [],
            },
            {
              tier: 'Institutional',
              price: { monthly: 750, quarterly: 690, yearly: 622 },
              qtrTotal: 2070, yrTotal: 7470,
              desc: 'The full 15-section report with risk matrices, lease rollover, and strategic outlook. Built for LPs.',
              featured: false,
              color: C.navy,
              features: [
                'Up to 15 report sections',
                'Investment thesis tracking',
                'Lease expiration and rollover curves',
                'Risk matrix with severity ratings',
                'Strategic outlook (30/60/90-day plan)',
                'Budget vs. actual with visual charts',
                'Premium visualizations',
                'Everything in Professional',
              ],
              limitations: [],
            },
          ]).map((plan, idx) => {
            const monthlyEquiv = plan.price[billingCycle]
            const periodLabel = billingCycle === 'monthly' ? '/mo' : billingCycle === 'quarterly' ? '/mo' : '/mo'
            const billingNote = billingCycle === 'quarterly' ? `$${plan.qtrTotal} billed quarterly` : billingCycle === 'yearly' ? `$${plan.yrTotal.toLocaleString()} billed annually` : 'billed monthly'

            return (
              <FadeIn key={idx} delay={idx * 0.08}>
                <div style={{ background: C.bg, border: plan.featured ? `2px solid ${C.accent}` : `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: plan.featured ? `0 8px 32px ${C.accent}12` : '0 2px 12px rgba(0,0,0,0.03)' }}>
                  {plan.featured && (
                    <div style={{ position: 'absolute', top: 16, right: -32, background: C.accent, color: '#fff', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, padding: '5px 40px', transform: 'rotate(45deg)', letterSpacing: '0.04em' }}>POPULAR</div>
                  )}

                  {/* Tier name + badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: plan.color, opacity: 0.8 }} />
                    <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plan.tier}</span>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 12 }}>
                    <span style={{ fontFamily: "'Newsreader', serif", fontSize: 48, fontWeight: 500, color: C.text, lineHeight: 1 }}>${monthlyEquiv}</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.textSoft }}>{periodLabel}</span>
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: C.textMuted, marginTop: 4 }}>per property · {billingNote}</div>

                  {/* Description */}
                  <P style={{ marginTop: 16, fontSize: 14 }}>{plan.desc}</P>

                  {/* CTA */}
                  <a href={dashboardHref} className={plan.featured ? 'btn-primary' : 'btn-secondary'} style={{ display: 'block', textAlign: 'center', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, textDecoration: 'none', padding: '13px 24px', borderRadius: 10, color: plan.featured ? '#fff' : C.text, background: plan.featured ? C.accent : 'transparent', border: plan.featured ? 'none' : `1.5px solid ${C.border}`, transition: 'all 0.25s', boxShadow: plan.featured ? `0 2px 12px ${C.accent}30` : 'none', marginTop: 24 }}>
                    {isSignedIn ? 'Go to Dashboard' : 'Start Free Trial'}
                  </a>

                  {/* Divider */}
                  <div style={{ height: 1, background: C.borderL, margin: '24px 0' }} />

                  {/* Features */}
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>What&apos;s included</div>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <span style={{ flexShrink: 0, marginTop: 2 }}>{Icons.check(plan.featured ? C.accent : C.green)}</span>
                      <span style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: C.textMid, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}

                  {/* Limitations (Foundational only) */}
                  {plan.limitations.length > 0 && (
                    <>
                      <div style={{ height: 1, background: C.borderL, margin: '16px 0' }} />
                      {plan.limitations.map((l, li) => (
                        <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <span style={{ flexShrink: 0, marginTop: 2 }}>{Icons.x(C.textMuted)}</span>
                          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{l}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </FadeIn>
            )
          })}
        </div>

        {/* Bottom note */}
        <FadeIn delay={0.3}>
          <div style={{ textAlign: 'center', marginTop: 36, fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>
            Free tier available — 2 properties, no credit card required · All plans include PDF, HTML, and email export
          </div>
        </FadeIn>
      </Section>

      {/* ═══ BEFORE / AFTER ═══ */}
      <Section bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}><Tag>The Difference</Tag><H2>Stop screenshotting Excel<br/><span style={{ color: C.textSoft }}>into Word</span></H2></div></FadeIn>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48 }}>
          <FadeIn delay={0.08}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Manual process</div>
              {['Export T-12 from Yardi. Paste into Excel.','Build charts manually. Screenshot into Word.','Fix broken fonts and column alignment.','Write narrative. Triple-check every number.','Send to managing partner. Receive redlines.','Corrections. Repeat. Convert to PDF.','Upload to investor portal. Next property.','Repeat for 27 more properties.'].map((t,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9, fontFamily: 'DM Sans', fontSize: 13.5, color: C.textMid, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{Icons.x(C.red + '80')}</span>{t}
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '11px 14px', background: `${C.red}08`, borderRadius: 8, fontFamily: 'DM Sans', fontSize: 13, color: C.red }}>4-8 hours per property · 2-4 people involved</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.16}>
            <div style={{ background: C.bg, border: `1px solid ${C.accent}25`, borderRadius: 16, padding: 26, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>WriteUp AI</div>
              {['Upload your T-12, rent roll, and any supporting files.','Paste your notes or answer guided questions.','Platform generates up to 15 sections with inline charts.','Revenue waterfalls, occupancy gauges, KPI cards — built in.','Your brand colors, logo, and disclaimer on every page.','Edit any section manually or regenerate with AI instructions.','Export as PDF, HTML, or copy email-ready HTML.','One person. One workflow. Every property.'].map((t,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9, fontFamily: 'DM Sans', fontSize: 13.5, color: C.textMid, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{Icons.check(C.accent)}</span>{t}
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '11px 14px', background: `${C.accent}08`, borderRadius: 8, fontFamily: 'DM Sans', fontSize: 13, color: C.accentD }}>5 minutes per property · 1 person</div>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ═══ WHO IT'S FOR ═══ */}
      <Section bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}><Tag>Who It&apos;s For</Tag><H2>If you owe your investors a report,<br/><em>this is for you</em></H2></div></FadeIn>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48 }}>
          <FadeIn delay={0.08}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>The Asset Manager</div>
              <H3>Marcus</H3>
              <P style={{ marginTop: 10, fontSize: 14.5 }}>VP of Asset Management. Manages 12 properties, oversees 16 more. Spends 60-80 hours per quarter on report production — formatting charts, fixing fonts, screenshotting Excel into Word.</P>
              <div style={{ marginTop: 16, padding: '12px 14px', background: `${C.accent}06`, borderRadius: 10, borderLeft: `3px solid ${C.accent}40`, fontFamily: 'DM Sans', fontSize: 14, color: C.accentD, fontStyle: 'italic' }}>&ldquo;I want to spend my time doing actual asset management — not formatting Word documents.&rdquo;</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.16}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.darkMid, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>The Managing Partner</div>
              <H3>James</H3>
              <P style={{ marginTop: 10, fontSize: 14.5 }}>Raised Fund III at $180M. His institutional LP asks for inline charts, risk matrices, and 30-60-90 action plans. He needs quality that matches CBRE. He does not have $150K for a reporting analyst.</P>
              <div style={{ marginTop: 16, padding: '12px 14px', background: `${C.darkMid}08`, borderRadius: 10, borderLeft: `3px solid ${C.darkMid}40`, fontFamily: 'DM Sans', fontSize: 14, color: C.darkMid, fontStyle: 'italic' }}>&ldquo;I need a tool. Not another headcount.&rdquo;</div>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto 40px' }}><Tag>FAQ</Tag><H2>The questions your<br/><em>compliance team will ask</em></H2></div></FadeIn>
        <FadeIn delay={0.1}><div style={{ maxWidth: 700, margin: '0 auto' }}><FAQ items={faqItems} /></div></FadeIn>
      </Section>

      {/* ═══ FINAL CTA ═══ */}
      <Section id="get-started" bg={C.bgAlt} style={{ paddingBottom: 112 }}>
        <FadeIn>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto', padding: '52px 36px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 380, height: 380, background: `radial-gradient(circle, ${C.accent}08 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <H2>Try it on your most<br/><em>scrutinized property</em></H2>
              <P style={{ marginTop: 16, maxWidth: 460, margin: '16px auto 0' }}>Upload a real T-12 for a property you know inside and out. Generate the report. Review every number, every chart, every section. If it is not better than what you produce manually, you lost 5 minutes.</P>
              <div style={{ marginTop: 28 }}><Btn href={dashboardHref} primary style={{ fontSize: 16, padding: '14px 34px' }}>{ctaLabel}</Btn></div>
              <div style={{ marginTop: 16, fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>Free tier · 2 properties · No credit card required</div>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: `1px solid ${C.borderL}`, padding: '36px 24px', background: C.bgWarm }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#fff' }}>W</div>
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 17, fontWeight: 500, color: C.text }}>WriteUp AI</span>
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>Built for multifamily. Not adapted from something else.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy','Terms','Contact'].map(t => <a key={t} href="#" style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = C.text} onMouseLeave={e => (e.target as HTMLElement).style.color = C.textMuted}>{t}</a>)}
          </div>
        </div>
      </footer>
    </div>
  )
}
