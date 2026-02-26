'use client'

/*
 * WRITEUP AI — Landing Page v7 (TypeScript Clean Build)
 * Hormozi Value Equation + All Interactive Demos
 */

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const C = {
  accent: '#00B7DB', accentD: '#1D98B1', accentDD: '#2D7886',
  accentAction: '#0C7792', accentText: '#007A99',
  dark: '#223033', darkMid: '#2E545C',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7', bgCard: '#FAFAF8',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  navy: '#002D5F', red: '#CC0000', green: '#008A3E', greenBtn: '#29581D',
  gold: '#C8B88A', retOrg: '#B45309', progressTrack: '#DDD9D2',
}

const fontLink = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap'

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════════ */
const I = {
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
  folder: (c = C.accent) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  check: (c = C.green) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (c = C.red) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  minus: (c = '#D4A043') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  clock: (c = C.textMuted) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  arrowR: (c = '#fff', s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  sparkle: (c = '#fff', s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4m0 10v4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M3 12h4m10 0h4M5.6 18.4l2.8-2.8m7.2-7.2l2.8-2.8"/></svg>,
  send: (c = '#fff', s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  eye: (c = C.textSoft, s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  bullet: (c = C.accent) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY COMPONENTS (fully typed)
   ═══════════════════════════════════════════════════════════════ */
function FadeIn({ children, delay = 0, className = '', style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`, ...style }}>{children}</div>
}

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold })
    obs.observe(el); return () => obs.disconnect()
  }, [threshold])
  return [ref, v]
}

function AnimNum({ end, suffix = '', dur = 2200 }: { end: number; suffix?: string; dur?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true; const t0 = performance.now()
        const tick = (now: number) => { const p = Math.min((now - t0) / dur, 1); setVal(Math.round((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 }); obs.observe(el); return () => obs.disconnect()
  }, [end, dur])
  return <span ref={ref}>{val}{suffix}</span>
}

const Sec = ({ children, bg = C.bg, id, style = {} }: { children: React.ReactNode; bg?: string; id?: string; style?: React.CSSProperties }) => (
  <section id={id} style={{ background: bg, padding: '96px 24px', position: 'relative', ...style }}><div style={{ maxWidth: 1120, margin: '0 auto' }}>{children}</div></section>
)
const Tag = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '5px 14px', background: `${C.accent}0D`, border: `1px solid ${C.accent}22`, borderRadius: 100, fontSize: 12, fontWeight: 600, color: C.accent, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent }} />{children}</div>
)
const H1 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 500, lineHeight: 1.12, color: C.text, margin: 0, letterSpacing: '-0.02em', ...style }}>{children}</h1>
const H2 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 500, lineHeight: 1.15, color: C.text, margin: 0, letterSpacing: '-0.015em', ...style }}>{children}</h2>
const H3 = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 500, lineHeight: 1.25, color: C.text, margin: 0, ...style }}>{children}</h3>
const P = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <p style={{ fontFamily: 'DM Sans', fontSize: 16, lineHeight: 1.7, color: C.textMid, margin: 0, ...style }}>{children}</p>
const Btn = ({ children, href = '#', primary = true, style = {} }: { children: React.ReactNode; href?: string; primary?: boolean; style?: React.CSSProperties }) => (
  <a href={href} className={primary ? 'btn-primary' : 'btn-secondary'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, textDecoration: 'none', padding: '13px 28px', borderRadius: 10, color: primary ? '#fff' : C.text, background: primary ? C.accent : 'transparent', border: primary ? 'none' : `1.5px solid ${C.border}`, transition: 'all 0.25s', boxShadow: primary ? `0 2px 12px ${C.accent}30` : 'none', ...style }}>{children}</a>
)

/* ═══════════════════════════════════════════════════════════════
   REPORT MOCKUP DATA & COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
const MONTHS_SHORT = ['Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov']
const T12_NOI = [72891,85234,78456,91023,88567,95234,102371,89456,84321,79876,90516,113848]
const T12_BUD = [81000,83500,82000,84000,85500,86000,87500,88000,88500,89000,90000,91000]
const OCC = [94.2,95.1,94.8,93.9,93.5,94.0,93.2,92.8,92.5,92.3,92.3,91.4]
const OCC_BUD = [95.0,95.0,95.0,95.0,95.0,95.0,95.0,95.0,94.5,94.5,94.0,94.0]
const EXP = [
  { name: 'Property Taxes', actual: 46244, budget: 62892 },
  { name: 'Payroll & Related', actual: 35072, budget: 34500 },
  { name: 'Property Insurance', actual: 18429, budget: 18400 },
  { name: 'Contract Services', actual: 17960, budget: 16800 },
  { name: 'Utilities', actual: 13216, budget: 11500 },
  { name: 'Management Fee', actual: 8910, budget: 8900 },
]
const fF = (v: number) => '$' + v.toLocaleString()
const fK = (v: number) => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'K' : '$' + v
const pts = (d: number[], w: number, h: number, p: number, mn: number, mx: number) => d.map((v, i) => ({ x: p + (i / (d.length - 1)) * (w - p * 2), y: p + ((mx - v) / (mx - mn)) * (h - p * 2) }))
const pl = (p: { x: number; y: number }[]) => p.map(pt => `${pt.x},${pt.y}`).join(' ')

function ReportHeader() {
  return (
    <div style={{ borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
      <div className="rpt-head" style={{ background: C.navy, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, fontFamily: 'DM Sans' }}>Asset Performance Report</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginTop: 2, fontFamily: 'DM Sans' }}>Oakmont Ridge Apartments · 234 Units</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'DM Sans' }}>November 2025</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans' }}>San Antonio, TX · Class B Value-Add</div>
        </div>
      </div>
      <div className="rpt-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: `3px solid ${C.red}`, background: '#fff' }}>
        {[{ label: 'NOI', value: '$113,848', delta: '+25.8%', up: true },{ label: 'Revenue', value: '$277,826', delta: '\u20131.2%', up: false },{ label: 'Physical Occ.', value: '91.4%', delta: '\u201390 bps', up: false },{ label: 'Economic Occ.', value: '80.0%', delta: '\u201370 bps', up: false },{ label: 'NOI Margin', value: '41.0%', delta: '+880 bps', up: true }].map((m, i) => (
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

function BudgetTable() {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 1, fontFamily: 'DM Sans' }}>Budget vs. Actual — Operating Expenses</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 10, fontFamily: 'DM Sans' }}>November 2025</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans' }}>
        <thead><tr style={{ borderBottom: `2px solid ${C.navy}` }}>
          {['Category','Actual','Budget','Var ($)',''].map((h, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '5px 5px', fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {EXP.map((item, i) => { const v = item.budget - item.actual; const fav = v >= 0; return (
            <tr key={i} style={{ borderBottom: '1px solid #F3F3F3' }}>
              <td style={{ padding: '6px 5px', fontSize: 10, color: '#444', fontWeight: 500 }}>{item.name}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>{fF(item.actual)}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, color: '#999', fontVariantNumeric: 'tabular-nums' }}>{fF(item.budget)}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: fav ? C.green : C.red, fontVariantNumeric: 'tabular-nums' }}>{fav ? '' : '('}${Math.abs(v).toLocaleString()}{fav ? '' : ')'}</td>
              <td style={{ padding: '6px 5px', width: 45 }}><div style={{ display: 'flex', justifyContent: fav ? 'flex-start' : 'flex-end' }}><div style={{ height: 4, width: `${Math.min(Math.abs(v) / 18000 * 100, 100)}%`, minWidth: 2, borderRadius: 2, background: fav ? C.green : C.red, opacity: 0.5 }} /></div></td>
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

function OccChart() {
  const w = 300, h = 120, pad = 28, mn = 88, mx = 97
  const pA = pts(OCC, w, h, pad, mn, mx), pB = pts(OCC_BUD, w, h, pad, mn, mx)
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>Physical Occupancy — Actual vs. Budget</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 8, fontFamily: 'DM Sans' }}>T-12</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {[90, 92, 94, 96].map((v, i) => { const y = pad + ((mx - v) / (mx - mn)) * (h - pad * 2); return <g key={i}><line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#F0F0F0" /><text x={pad - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#CCC" fontFamily="DM Sans">{v}%</text></g> })}
        <polyline points={pl(pB)} fill="none" stroke={C.red} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.3" />
        <polyline points={pl(pA)} fill="none" stroke={C.navy} strokeWidth="2" strokeLinejoin="round" />
        {pA.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === 11 ? 3 : 1.8} fill={i === 11 ? C.red : C.navy} stroke="#fff" strokeWidth="1" /><text x={p.x} y={h - 3} textAnchor="middle" fontSize="6" fill="#BBB" fontFamily="DM Sans">{MONTHS_SHORT[i]}</text></g>)}
      </svg>
    </div>
  )
}

function NOIChart() {
  const w = 300, h = 120, pad = 28, mn = 60000, mx = 120000
  const pB = pts(T12_BUD, w, h, pad, mn, mx)
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>NOI — Actual vs. Budget</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 8, fontFamily: 'DM Sans' }}>Monthly T-12</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        {[70000, 85000, 100000, 115000].map((v, i) => { const y = pad + ((mx - v) / (mx - mn)) * (h - pad * 2); return <g key={i}><line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#F0F0F0" /><text x={pad - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#CCC" fontFamily="DM Sans">${(v / 1000)}K</text></g> })}
        {T12_NOI.map((v, i) => { const bw = (w - pad * 2) / 12 * 0.5; const x = pad + (i / 11) * (w - pad * 2) - bw / 2; const bh = ((v - mn) / (mx - mn)) * (h - pad * 2); const over = v > T12_BUD[i]; return <rect key={i} x={x} y={h - pad - bh} width={bw} height={bh} fill={over ? C.navy : C.red} opacity={i === 11 ? 0.85 : over ? 0.35 : 0.25} rx="2" /> })}
        <polyline points={pl(pB)} fill="none" stroke={C.red} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.45" />
        {MONTHS_SHORT.map((m, i) => <text key={i} x={pad + (i / 11) * (w - pad * 2)} y={h - 3} textAnchor="middle" fontSize="6" fill="#BBB" fontFamily="DM Sans">{m}</text>)}
      </svg>
    </div>
  )
}

function Waterfall() {
  const items = [
    { label: 'GPR', val: 280333, base: 0, color: C.navy, neg: false },
    { label: 'Vacancy', val: 22476, base: 257857, color: C.red, neg: true },
    { label: 'LTL', val: 20724, base: 237133, color: C.red, neg: true },
    { label: 'Bad Debt', val: 7703, base: 229430, color: C.red, neg: true },
    { label: 'Net Rent', val: 224323, base: 0, color: C.green, neg: false },
    { label: 'Other', val: 53503, base: 0, color: C.accent, neg: false },
    { label: 'Total Rev.', val: 277826, base: 0, color: C.navy, neg: false },
  ]; const mx = 295000
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EDEDED', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: 'DM Sans' }}>Revenue Waterfall — GPR to Total Revenue</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 12, fontFamily: 'DM Sans' }}>November 2025</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130, paddingBottom: 22, position: 'relative' }}>
        {items.map((item, i) => { const bH = Math.max((item.val / mx) * 105, 4); const bot = 22 + (item.base / mx) * 105; return (
          <div key={i} style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div style={{ position: 'absolute', bottom: bot, width: '76%', left: '12%', height: bH, background: item.color, borderRadius: 1.5, opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 5, width: '100%', textAlign: 'center', fontSize: 6.5, color: '#999', fontFamily: 'DM Sans' }}>{item.label}</div>
            <div style={{ position: 'absolute', bottom: bot + bH + 2, width: '100%', textAlign: 'center', fontSize: 7, fontWeight: 600, color: item.neg ? C.red : item.color, fontFamily: 'DM Sans' }}>{item.neg ? '\u2013' : ''}{fK(item.val)}</div>
          </div>) })}
      </div>
    </div>
  )
}

function Narrative() {
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
   CARD PROGRESSION (5-Stage Workflow Demo)
   ═══════════════════════════════════════════════════════════════ */
type StageKey = 'draft' | 'in_review' | 'final_review' | 'ready_to_send' | 'sent'
const STAGES: { key: StageKey; label: string; hint: string; pct: number }[] = [
  { key: 'draft', label: 'Draft', hint: 'Not yet generated', pct: 0 },
  { key: 'in_review', label: 'In Review', hint: 'Reviewing content', pct: 25 },
  { key: 'final_review', label: 'Final Review', hint: 'Pending approval', pct: 50 },
  { key: 'ready_to_send', label: 'Ready to Send', hint: 'Ready for investors', pct: 75 },
  { key: 'sent', label: 'Sent', hint: 'Delivered', pct: 100 },
]
const SB: Record<StageKey, { color: string; bg: string; border: string }> = {
  draft: { color: C.gold, bg: `${C.gold}10`, border: `${C.gold}22` },
  in_review: { color: C.accentText, bg: `${C.accentAction}08`, border: `${C.accentAction}18` },
  final_review: { color: C.navy, bg: `${C.navy}08`, border: `${C.navy}18` },
  ready_to_send: { color: C.green, bg: `${C.green}10`, border: `${C.green}22` },
  sent: { color: C.greenBtn, bg: `${C.greenBtn}08`, border: `${C.greenBtn}18` },
}
const SA: Record<StageKey, { label: string; icon: string } | null> = {
  draft: { label: 'Generate Report', icon: 'sparkle' }, in_review: { label: 'Submit for Approval', icon: 'arrow' },
  final_review: { label: 'Approve', icon: 'check' }, ready_to_send: { label: 'Mark as Sent', icon: 'send' }, sent: null,
}
const SC: Record<StageKey, string> = { draft: C.gold, in_review: C.accentAction, final_review: C.navy, ready_to_send: C.green, sent: C.greenBtn }

function StagePill({ stage }: { stage: StageKey }) {
  const s = STAGES.find(x => x.key === stage); const b = SB[stage]
  return <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: b.color, background: b.bg, border: `1px solid ${b.border}`, borderRadius: 100, padding: '3px 10px', lineHeight: '1.4', whiteSpace: 'nowrap' }}>{s?.label}</span>
}

function getAIcon(icon: string) {
  if (icon === 'sparkle') return I.sparkle('#fff', 15); if (icon === 'arrow') return I.arrowR('#fff', 15)
  if (icon === 'check') return I.check('#fff'); if (icon === 'send') return I.send('#fff', 15); return null
}

function CardProgression() {
  const [ref, vis] = useInView(0.2)
  const [idx, setIdx] = useState(0)
  useEffect(() => { if (!vis) return; const t = setInterval(() => setIdx(p => (p + 1) % 5), 2200); return () => clearInterval(t) }, [vis])
  const stage = STAGES[idx]; const act = SA[stage.key]; const isG = idx >= 3
  return (
    <div ref={ref} style={{ maxWidth: 460, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
        {STAGES.map((s, i) => { const active = i === idx, done = i < idx, col = SC[s.key]; return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 4px' }}>
              <div style={{ width: active ? 28 : done ? 22 : 18, height: active ? 28 : done ? 22 : 18, borderRadius: '50%', background: active ? col : done ? `${SC[STAGES[idx].key]}30` : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? `0 0 16px ${col}35` : 'none', transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)' }}>
                {(active || done) && I.check(active ? '#fff' : `${SC[STAGES[idx].key]}80`)}
              </div>
              <span className="stg-lbl" style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? col : C.textMuted, letterSpacing: '0.03em', whiteSpace: 'nowrap', transition: 'all 0.3s', fontFamily: 'DM Sans' }}>{s.label}</span>
            </div>
            {i < 4 && <div style={{ width: 28, height: 2, background: done ? `${SC[STAGES[idx].key]}30` : C.borderL, borderRadius: 100, transition: 'background 0.5s', marginBottom: 18 }} />}
          </div>) })}
      </div>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.05)', transition: 'all 0.4s' }}>
        <div style={{ padding: '18px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Riverstone at Meadow Creek</h4>
            <StagePill stage={stage.key} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, color: C.textSoft, marginBottom: 14, fontFamily: 'DM Sans' }}>
            <span>January 2026</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: C.border }} /><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.textMuted }}>{I.clock()} 2h ago</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 4, background: C.progressTrack, borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 100, background: isG ? C.green : C.accent, width: `${stage.pct}%`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
            <div style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', transition: 'all 0.3s', fontFamily: 'DM Sans' }}>{stage.hint}</div>
          </div>
          <div className="card-acts" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {act ? (
              <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accentAction, borderRadius: 10, boxShadow: `0 2px 10px ${C.accentAction}25`, whiteSpace: 'nowrap', transition: 'all 0.3s', fontFamily: 'DM Sans' }}>{getAIcon(act.icon)} {act.label}</div>
            ) : (
              <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: C.greenBtn, background: `${C.greenBtn}08`, borderRadius: 10, border: `1px solid ${C.greenBtn}18`, fontFamily: 'DM Sans' }}>{I.check(C.greenBtn)} Delivered</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', fontSize: 14, fontWeight: 500, color: C.textMid, background: C.bgAlt, border: `1px solid ${C.borderL}`, borderRadius: 10, fontFamily: 'DM Sans' }}>
              {stage.key === 'ready_to_send' ? <>{I.download(C.accentAction)} Download</> : <>{I.eye()} View</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD DEMO
   ═══════════════════════════════════════════════════════════════ */
const DR: { name: string; period: string; time: string; stage: StageKey }[] = [
  { name: 'Riverstone at Meadow Creek', period: 'January 2026', time: '2h ago', stage: 'ready_to_send' },
  { name: 'The Belmont at Westfield', period: 'January 2026', time: '5h ago', stage: 'final_review' },
  { name: 'Avila View Apartments', period: 'January 2026', time: '7h ago', stage: 'sent' },
  { name: 'Hill at Woodway', period: 'January 2026', time: '1d ago', stage: 'in_review' },
]

function DashboardDemo() {
  const [ref, vis] = useInView(0.15)
  const [glow, setGlow] = useState(-1)
  useEffect(() => { if (!vis) return; let i = 0; const t = setInterval(() => { setGlow(i); setTimeout(() => setGlow(-1), 800); i = (i + 1) % 4 }, 2000); return () => clearInterval(t) }, [vis])
  return (
    <div ref={ref} style={{ maxWidth: 780, margin: '0 auto', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1)' }}>
      <div style={{ background: '#F3F3F3', borderRadius: '12px 12px 0 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>{['#FF5F57','#FFBD2E','#28CA41'].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}</div>
        <div style={{ flex: 1, textAlign: 'center' }}><span style={{ fontSize: 11, color: '#999', background: '#E8E8E8', padding: '3px 40px', borderRadius: 6 }}>writeupai.com/dashboard</span></div>
      </div>
      <div style={{ background: C.bgWarm, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px 28px' }}>
        <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 500, color: C.text, marginBottom: 4, marginTop: 0 }}>Welcome back, James</h4>
        <p style={{ fontSize: 13, color: C.textSoft, marginBottom: 20, marginTop: 0, fontFamily: 'DM Sans' }}>Here&apos;s what&apos;s happening with your portfolio</p>
        <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, marginTop: 20 }}>
          {[{ label: 'PROPERTIES', value: '28', sub: '4,212 total units', color: C.text },{ label: 'REPORTS THIS MONTH', value: '22', sub: 'January 2026', color: C.accent },{ label: 'IN PIPELINE', value: '6', sub: 'Across all stages', color: C.retOrg },{ label: 'DELIVERED', value: '147', sub: 'All time', color: C.green }].map((s, i) => (
            <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s', transitionDelay: `${300 + i * 100}ms` }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 3, fontFamily: 'DM Sans' }}>{s.label}</div>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 26, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, fontFamily: 'DM Sans' }}>{s.sub}</div>
            </div>))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h5 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 16, fontWeight: 500, color: C.text, margin: 0 }}>Recent Reports</h5>
          <span style={{ fontSize: 13, color: C.accentText, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans' }}>View all {I.arrowR(C.accentText, 12)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DR.map((r, i) => { const stg = STAGES.find(s => s.key === r.stage)!; const isGreen = stg.pct >= 75; const gl = glow === i; return (
            <div key={i} className="dash-row" style={{ background: gl ? C.bgWarm : C.bg, border: `1px solid ${gl ? `${C.accent}30` : C.border}`, borderRadius: 12, padding: '11px 14px', display: 'grid', gridTemplateColumns: '1fr 130px auto 20px', alignItems: 'center', gap: 14, transition: 'all 0.35s', cursor: 'pointer', boxShadow: gl ? `0 0 16px ${C.accent}12` : 'none', opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-10px)', transitionDelay: `${600 + i * 80}ms` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 15, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSoft, fontFamily: 'DM Sans' }}><span>{r.period}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: C.border }} /><span style={{ color: C.textMuted }}>{r.time}</span></div>
              </div>
              <div className="dash-prog" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 100, height: 4, background: C.progressTrack, borderRadius: 100, overflow: 'hidden', marginBottom: 3 }}><div style={{ height: '100%', width: `${stg.pct}%`, background: isGreen ? C.green : C.accent, borderRadius: 100, transition: 'width 0.8s' }} /></div>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'DM Sans' }}>{stg.hint}</span>
              </div>
              <div style={{ justifySelf: 'end' }}><StagePill stage={r.stage} /></div>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={gl ? C.accentAction : C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', transform: gl ? 'translateX(2px)' : 'none' }}><polyline points="9 18 15 12 9 6" /></svg>
            </div>) })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BRANDING DEMO
   ═══════════════════════════════════════════════════════════════ */
const BP = [
  { key: 'navyGold', name: 'Navy & Gold', primary: '#1B2A4A', accent: '#C9A84C' },
  { key: 'charcoal', name: 'Charcoal & Sapphire', primary: '#27272A', accent: '#2563EB' },
  { key: 'slateEmerald', name: 'Slate & Emerald', primary: '#334155', accent: '#059669' },
  { key: 'navyCrimson', name: 'Executive Navy', primary: '#002D5F', accent: '#CC0000' },
  { key: 'modern', name: 'Modern Teal', primary: '#0F766E', accent: '#14B8A6' },
  { key: 'elegant', name: 'Elegant Charcoal', primary: '#18181B', accent: '#6366F1' },
]

function BrandingDemo() {
  const [ref, vis] = useInView(0.1)
  const [ai, setAi] = useState(0)
  const [ap, setAp] = useState(true)
  const colors = BP[ai]
  useEffect(() => { if (!vis || !ap) return; const t = setInterval(() => setAi(p => (p + 1) % BP.length), 2500); return () => clearInterval(t) }, [vis, ap])
  const sel = (i: number) => { setAp(false); setAi(i); setTimeout(() => setAp(true), 8000) }
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1)' }}>
      <div className="brand-sel" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {BP.map((p, i) => (
          <button key={p.key} onClick={() => sel(i)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${ai === i ? `${C.accent}40` : C.borderL}`, background: ai === i ? `${C.accent}06` : C.bg, cursor: 'pointer', transition: 'all 0.25s' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: p.primary, border: '1px solid rgba(0,0,0,0.06)' }} />
              <div style={{ width: 12, height: 12, borderRadius: 3, background: p.accent, border: '1px solid rgba(0,0,0,0.06)' }} />
            </div>
            <span className="brand-name" style={{ fontSize: 12, fontWeight: ai === i ? 600 : 400, color: ai === i ? C.accent : C.textSoft, fontFamily: 'DM Sans' }}>{p.name}</span>
          </button>))}
      </div>
      <div style={{ maxWidth: 700, margin: '0 auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textMuted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans' }}>{I.eye(C.textMuted, 11)} LIVE PREVIEW</div>
        <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div style={{ background: colors.primary, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'background 0.5s', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, fontFamily: 'DM Sans' }}>Walker Capital Group</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Newsreader', Georgia, serif", marginTop: 2 }}>Riverstone at Meadow Creek</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'DM Sans' }}>January 2026</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans' }}>312 Units · Sugar Land, TX</div>
            </div>
          </div>
          <div style={{ height: 3, background: colors.accent, transition: 'background 0.5s' }} />
          <div className="brand-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#fff' }}>
            {[{ label: 'NOI', value: '$278,614', change: '+3.2%' },{ label: 'Revenue', value: '$399,750', change: '+1.8%' },{ label: 'Expenses', value: '$163,978', change: '-14.0%' },{ label: 'Occupancy', value: '96.2%', change: '+120 bps' }].map((k, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRight: i < 3 ? '1px solid #EDEDED' : 'none' }}>
                <div style={{ fontSize: 8, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 4, fontFamily: 'DM Sans' }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.primary, fontVariantNumeric: 'tabular-nums', transition: 'color 0.5s', fontFamily: "'Newsreader', Georgia, serif" }}>{k.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.green, marginTop: 2, fontFamily: 'DM Sans' }}>{k.change} MoM</div>
              </div>))}
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, padding: '0 8px' }}>
          {[38, 42, 48, 53, 56, 62].map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i === 5 ? colors.primary : `${colors.primary}40`, transition: 'background 0.5s' }} />)}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, color: C.textMuted, marginTop: 8, fontFamily: 'DM Sans' }}>NOI Trailing 6 Months — Colors update in real-time</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════ */
function FAQSection({ items }: { items: { q: string; a: string }[] }) {
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
        </div>))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function WriteUpLanding() {
  const { isSignedIn } = useAuth()
  const [scrollY, setScrollY] = useState(0)
  const [mob, setMob] = useState(false)
  useEffect(() => { const fn = () => setScrollY(window.scrollY); window.addEventListener('scroll', fn, { passive: true }); return () => window.removeEventListener('scroll', fn) }, [])
  const navSolid = scrollY > 50
  const dashboardHref = isSignedIn ? '/dashboard' : '/sign-up'
  const ctaLabel = isSignedIn ? 'Go to Dashboard' : 'Generate a Free Report'

  const navItems = [{ t: 'How It Works', h: '#how-it-works' },{ t: 'The Report', h: '#report-preview' },{ t: 'Platform', h: '#platform' },{ t: 'Pricing', h: '#pricing' },{ t: 'FAQ', h: '#faq' }]

  const faq = [
    { q: 'How is this different from pasting my T-12 into ChatGPT?', a: "ChatGPT returns a paragraph. WriteUp AI returns a multi-section branded investor report with revenue waterfall charts, expense variance bars, occupancy gauges, KPI cards with MoM comparisons, your firm's logo and colors, and a PDF that renders identically across browsers. It parses your T-12 line by line, calculates real variances against your budget, and enforces the NOI ceiling rule." },
    { q: 'Will my investors know this was generated by AI?', a: "No. Reports carry your firm's logo, brand colors, and custom disclaimer. No AI watermarks or badges. Every section is reviewed and approved by your team before export. This is a drafting tool with human approval built into the workflow." },
    { q: 'Does the AI make up numbers?', a: 'The AI does not guess. It parses your uploaded T-12 line by line, column by column, and extracts exact values. All analysis stops at NOI — no debt service, no distributions, no below-the-line items unless you explicitly provide that data. Nothing leaves the platform without your review.' },
    { q: 'Can I edit the report before sending it?', a: 'Every section is independently editable. Change a word, rewrite a paragraph, or adjust emphasis without touching other sections. You can regenerate individual sections with custom instructions — or edit them manually. The AI proposes. You dispose.' },
    { q: 'What happens to my data?', a: 'Encrypted in transit and at rest, stored in an isolated database with row-level security. Not shared with other users, not used to train AI models, not accessible for any purpose other than generating your reports.' },
    { q: 'We only report quarterly. Is it still worth it?', a: 'The reason most firms report quarterly is because monthly reporting takes too long. When each report takes 5 minutes instead of 5 hours, monthly becomes feasible. Firms that switch to monthly reporting see measurable improvements in LP confidence, retention, and capital re-up rates.' },
    { q: '$299 per property seems expensive.', a: 'Your VP of asset management costs roughly $120 per hour. Manual report creation takes 4-8 hours per property — that is $480 to $960 in labor cost alone, every reporting period. WriteUp AI costs $299 per property per month and reduces production time to under 8 minutes. It pays for itself on the first report.' },
    { q: 'What if I cancel?', a: 'Every report is exportable as PDF and HTML — standalone files that work forever. Your uploaded data can be downloaded at any time. No proprietary lock-in.' },
  ]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href={fontLink} rel="stylesheet" />
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
        @media(max-width:900px){
          .hero-grid{flex-direction:column!important}.hero-mockup{max-width:100%!important}
          .grid-2{grid-template-columns:1fr!important}.grid-3{grid-template-columns:1fr!important}
          .nav-links{display:none!important}.mobile-toggle{display:flex!important}
          .hero-ctas{flex-direction:column!important;align-items:stretch!important}
          .hero-ctas a{text-align:center;justify-content:center}
          .mockup-grid{grid-template-columns:1fr!important}
          .rpt-kpi{grid-template-columns:repeat(3,1fr)!important}
          .compare-table{overflow-x:auto!important}
          .dash-stats{grid-template-columns:repeat(2,1fr)!important}
          .dash-row{grid-template-columns:1fr auto!important;gap:8px!important}
          .dash-prog{display:none!important}
          .brand-sel{gap:6px!important}.brand-sel button{padding:5px 8px!important}
          .brand-name{display:none!important}
          .brand-kpi{grid-template-columns:repeat(2,1fr)!important}
          .card-acts{flex-wrap:wrap}.stg-lbl{font-size:7px!important}
          .roi-grid{grid-template-columns:1fr!important}
          .benefit-grid{grid-template-columns:1fr 1fr!important}
          .pillar-grid{grid-template-columns:1fr!important}
          .consist-grid{grid-template-columns:repeat(3,1fr)!important}
          .pricing-grid{grid-template-columns:1fr!important;max-width:480px;margin-left:auto;margin-right:auto}
        }
        @media(max-width:640px){
          .rpt-kpi{grid-template-columns:repeat(2,1fr)!important}
          .dash-stats{grid-template-columns:1fr 1fr!important}
          .benefit-grid{grid-template-columns:1fr!important}
          .brand-kpi{grid-template-columns:repeat(2,1fr)!important}
          .consist-grid{grid-template-columns:repeat(2,1fr)!important}
          section{padding-left:16px!important;padding-right:16px!important}
        }
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
            {navItems.map(n => <a key={n.t} href={n.h} style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: C.textMid, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.textMid)}>{n.t}</a>)}
            {isSignedIn ? (
              <Link href="/dashboard" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, padding: '9px 22px', borderRadius: 8, textDecoration: 'none', boxShadow: `0 2px 10px ${C.accent}25` }}>Dashboard</Link>
            ) : (<>
              <Link href="/sign-in" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: C.textMid, textDecoration: 'none' }}>Sign In</Link>
              <Link href="/sign-up" style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, padding: '9px 22px', borderRadius: 8, textDecoration: 'none', boxShadow: `0 2px 10px ${C.accent}25` }}>Start Free Trial</Link>
            </>)}
          </div>
          <button className="mobile-toggle" onClick={() => setMob(!mob)} aria-label="Menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none', flexDirection: 'column', gap: 5 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 20, height: 2, background: C.text, borderRadius: 1, transition: 'all 0.3s', transform: mob ? (i === 0 ? 'rotate(45deg) translate(5px,5px)' : i === 1 ? 'scaleX(0)' : 'rotate(-45deg) translate(5px,-5px)') : 'none', opacity: mob && i === 1 ? 0 : 1 }} />)}
          </button>
        </div>
        {mob && (
          <div className="mobile-menu-panel" style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.borderL}`, padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navItems.map(n => <a key={n.t} href={n.h} onClick={() => setMob(false)} style={{ fontFamily: 'DM Sans', fontSize: 15, color: C.textMid, textDecoration: 'none', padding: '10px 0', borderBottom: `1px solid ${C.borderL}` }}>{n.t}</a>)}
            <Link href={dashboardHref} onClick={() => setMob(false)} style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'center', background: C.accent, padding: '12px', borderRadius: 8, textDecoration: 'none', marginTop: 8 }}>{ctaLabel}</Link>
          </div>)}
      </nav>

      {/* ═══ HERO ═══ */}
      <Sec style={{ paddingTop: 128, paddingBottom: 40 }}>
        <div className="hero-grid" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
          <div style={{ flex: '1 1 52%' }}>
            <FadeIn><Tag>Investor Reporting Platform for Multifamily PE</Tag></FadeIn>
            <FadeIn delay={0.08}><H1>Beautiful, accurate investor reports —<br /><span style={{ color: C.accent }}>every month, without the work</span></H1></FadeIn>
            <FadeIn delay={0.16}>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Built specifically for multifamily asset managers','Institutional-grade reports generated in 5\u20138 minutes','Your branding, your approval workflow, your control'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'DM Sans', fontSize: 16, color: C.textMid, lineHeight: 1.5 }}><span style={{ flexShrink: 0 }}>{I.bullet(C.accent)}</span>{t}</div>))}
              </div>
            </FadeIn>
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
                <ReportHeader /><div style={{ marginTop: 8 }}><Narrative /></div>
                <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}><OccChart /><NOIChart /></div>
              </div>
            </FadeIn>
          </div>
        </div>
      </Sec>

      {/* ═══ STATS ═══ */}
      <div style={{ borderTop: `1px solid ${C.borderL}`, borderBottom: `1px solid ${C.borderL}`, padding: '32px 24px', background: C.bgWarm }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 52, flexWrap: 'wrap' }}>
          {[{ val: 8, sfx: ' min', label: 'Average report time' },{ val: 6, sfx: ' hrs', label: 'Saved per property/month' },{ val: 15, sfx: '', label: 'Report sections available' },{ val: 8, sfx: '+', label: 'Inline chart types' }].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontFamily: "'Newsreader', serif", fontSize: 32, fontWeight: 500, color: C.text }}><AnimNum end={s.val} suffix={s.sfx} /></div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textSoft, marginTop: 2 }}>{s.label}</div>
            </div>))}
        </div>
      </div>

      {/* ═══ TRUST PILLARS ═══ */}
      <Sec bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Purpose-Built for Real Estate</Tag><H2>This is not generic AI.<br /><em>This is a reporting system.</em></H2><P style={{ marginTop: 14 }}>Built specifically for multifamily private equity. Every financial metric, every chart type, every section structure is designed for investor communications — not adapted from something else.</P></div></FadeIn>
        <div className="pillar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 }}>
          {[{ icon: I.shield(C.accent), title: 'All analysis stops at NOI', desc: 'No debt service. No distributions. No below-the-line surprises. The AI never touches what it does not have data for. Your compliance team can verify this in the first report.' },{ icon: I.chart(C.accent), title: 'Parses your T-12 line by line', desc: 'Not summarization. The platform extracts every line item, every column, every month from your financials and calculates real variances against your budget upload.' },{ icon: I.report(C.accent), title: 'Correct CRE terminology', desc: 'GPR, EGI, LTL, concessions, economic occupancy, NOI margin. Every metric uses the language your LPs expect — because this was built by someone who has written hundreds of these reports.' }].map((b, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="hover-lift" style={{ background: C.bgAlt, border: `1px solid ${C.borderL}`, borderRadius: 14, padding: '24px 22px', height: '100%' }}>
                <div style={{ marginBottom: 14 }}>{b.icon}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{b.title}</div>
                <P style={{ fontSize: 14 }}>{b.desc}</P>
              </div>
            </FadeIn>))}
        </div>
      </Sec>

      {/* ═══ REPORT PREVIEW ═══ */}
      <Sec id="report-preview" bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>See the Output</Tag><H2>This is what your investors<br />will actually receive</H2><P style={{ marginTop: 14 }}>Real data. Real charts. Real financial analysis. Every element below is generated from a single T-12 upload.</P></div></FadeIn>
        <FadeIn delay={0.1}>
          <div style={{ marginTop: 44, background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.06)' }}>
            <ReportHeader /><div style={{ marginTop: 12 }}><Narrative /></div>
            <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}><Waterfall /><BudgetTable /></div>
            <div className="mockup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}><OccChart /><NOIChart /></div>
            <div style={{ marginTop: 14, textAlign: 'center', fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, padding: '10px 0', borderTop: `1px solid ${C.borderL}` }}>Sample report generated by WriteUp AI · Your reports carry your brand, not ours</div>
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ HOW IT WORKS ═══ */}
      <Sec id="how-it-works" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}><Tag>How It Works</Tag><H2>Three steps. Five minutes.<br /><em>Report done.</em></H2></div></FadeIn>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 }}>
          {[{ n: '01', title: 'Upload your financials', desc: 'Drop in your T-12, rent roll, and budget CSV. The platform parses every line item, every column, every month automatically.', icon: I.upload(C.accent) },{ n: '02', title: 'Answer 6 guided questions', desc: 'Quick context questions about occupancy, capital projects, and forward outlook. Takes 2 minutes. Ensures nothing gets missed.', icon: I.edit(C.accent) },{ n: '03', title: 'Review, approve, send', desc: 'A branded, chart-filled investor report generates in minutes. Your team reviews, edits what they want, and exports as PDF, HTML, or email.', icon: I.report(C.accent) }].map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="hover-lift" style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26, height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -14, right: -4, fontFamily: "'Newsreader', serif", fontSize: 96, fontWeight: 500, color: C.accent, opacity: 0.06, lineHeight: 1, pointerEvents: 'none' }}>{s.n}</div>
                <div style={{ width: 42, height: 42, borderRadius: 10, marginBottom: 16, background: `${C.accent}0D`, border: `1px solid ${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</div>
                <P style={{ fontSize: 14 }}>{s.desc}</P>
              </div>
            </FadeIn>))}
        </div>
      </Sec>

      {/* ═══ GOVERNANCE ═══ */}
      <Sec bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Governance &amp; Control</Tag><H2>Nothing reaches your investors<br /><em>without your sign-off</em></H2><P style={{ marginTop: 14 }}>Every report moves through a 5-stage pipeline with clear ownership at every step. Your team drafts. You approve. IR marks it sent.</P></div></FadeIn>
        <FadeIn delay={0.15}><div style={{ marginTop: 48 }}><CardProgression /></div></FadeIn>
      </Sec>

      {/* ═══ CONSISTENCY ═══ */}
      <Sec bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Institutional Consistency</Tag><H2>Same structure. Every property.<br /><em>Every period.</em></H2><P style={{ marginTop: 14 }}>Your LP knows exactly where to find NOI, the revenue waterfall, the occupancy trend, the variance analysis, and the risk flags. Consistency signals process maturity.</P></div></FadeIn>
        <FadeIn delay={0.1}>
          <div className="consist-grid" style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {['Executive Summary','NOI Performance','Revenue Waterfall','Expense Variance','Occupancy Trend'].map((s, i) => (
              <div key={i} style={{ background: C.bgAlt, border: `1px solid ${C.borderL}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Newsreader', serif", fontSize: 24, fontWeight: 500, color: C.accent, marginBottom: 6 }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: C.text }}>{s}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: C.textMuted, marginTop: 4 }}>Same position, every report</div>
              </div>))}
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ BRANDING DEMO ═══ */}
      <Sec bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}><Tag>Your Brand, Your Reports</Tag><H2>Institutional reports,<br /><em>branded to your firm</em></H2><P style={{ marginTop: 14 }}>Pick a palette or set custom colors. Every header, KPI card, chart, and table updates instantly to match your firm&apos;s identity.</P></div></FadeIn>
        <FadeIn delay={0.15}><div style={{ marginTop: 44 }}><BrandingDemo /></div></FadeIn>
      </Sec>

      {/* ═══ COMPARISON TABLE ═══ */}
      <Sec id="compare" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto' }}><Tag>Compare</Tag><H2>Why firms switch<br /><em>from what they use today</em></H2></div></FadeIn>
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
                  { feature: '5-stage approval workflow', wu: 'check', gpt: 'x', manual: 'x' },
                  { feature: 'Consistent format across 20+ properties', wu: 'check', gpt: 'x', manual: 'x' },
                  { feature: 'PDF export (cross-browser)', wu: 'check', gpt: 'x', manual: 'minus' },
                  { feature: 'Email-ready HTML (copy & paste)', wu: 'check', gpt: 'x', manual: 'x' },
                  { feature: 'Time per property', wu: '5\u20138 min', gpt: '30 min + rework', manual: '4\u20138 hours' },
                ].map((row, i) => {
                  const rc = (val: string, isWU: boolean) => val === 'check' ? I.check() : val === 'x' ? I.x() : val === 'minus' ? I.minus() : <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: isWU ? 700 : 500, color: isWU ? C.accent : C.textSoft }}>{val}</span>
                  return (<tr key={i} style={{ background: i % 2 === 0 ? C.bg : C.bgWarm }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: C.text, borderBottom: `1px solid ${C.borderL}` }}>{row.feature}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderL}`, background: `${C.accent}04`, borderLeft: `1px solid ${C.accent}15`, borderRight: `1px solid ${C.accent}15` }}>{rc(row.wu, true)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderL}` }}>{rc(row.gpt, false)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderL}` }}>{rc(row.manual, false)}</td>
                  </tr>)})}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ ROI MATH ═══ */}
      <Sec bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>The Math</Tag><H2>It pays for itself<br /><em>on the first report</em></H2></div></FadeIn>
        <FadeIn delay={0.1}>
          <div className="roi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48, maxWidth: 700, margin: '48px auto 0' }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Manual cost per property</div>
              {[{ label: 'VP hourly cost', value: '$120/hr' },{ label: 'Hours per report', value: '6 hours' },{ label: 'Cost per report', value: '$720' },{ label: '25 properties/month', value: '$18,000' }].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${C.borderL}` : 'none', fontFamily: 'DM Sans', fontSize: 14 }}>
                  <span style={{ color: C.textMid }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: i === 3 ? C.red : C.text, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
                </div>))}
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.accent}25`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>WriteUp AI cost per property</div>
              {[{ label: 'Professional tier', value: '$299/mo' },{ label: 'Time per report', value: '5\u20138 minutes' },{ label: 'Cost per report', value: '$299' },{ label: '25 properties/month', value: '$7,475' }].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${C.borderL}` : 'none', fontFamily: 'DM Sans', fontSize: 14 }}>
                  <span style={{ color: C.textMid }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: i === 3 ? C.accent : C.text, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
                </div>))}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ display: 'inline-block', background: `${C.green}08`, border: `1px solid ${C.green}22`, borderRadius: 12, padding: '14px 28px' }}>
              <span style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 500, color: C.green }}>$10,525</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 14, color: C.textMid, marginLeft: 10 }}>saved per month at 25 properties</span>
            </div>
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ DASHBOARD DEMO ═══ */}
      <Sec id="platform" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>The Platform</Tag><H2>Portfolio-level visibility.<br /><em>One dashboard.</em></H2><P style={{ marginTop: 14 }}>See every property, every report stage, every deadline in one view. Know exactly which reports are pending your approval and which have been delivered.</P></div></FadeIn>
        <FadeIn delay={0.15}><div style={{ marginTop: 48 }}><DashboardDemo /></div></FadeIn>
      </Sec>

      {/* ═══ VALUE STACK ═══ */}
      <Sec bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Everything Included</Tag><H2>A complete investor reporting system.<br /><em>Not just a report generator.</em></H2></div></FadeIn>
        <div className="benefit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
          {[
            { icon: I.chart(C.accent), title: 'Institutional-Grade Reports', desc: 'Up to 15 sections with inline charts — revenue waterfalls, NOI trend bars, occupancy gauges, expense variance, KPI cards, and risk matrices.' },
            { icon: I.folder(C.accent), title: 'Full Report Management', desc: 'Organize, track, and access every investor report across your entire portfolio. Status tracking, version history, and one-click navigation.' },
            { icon: I.shield(C.accent), title: '5-Stage Approval Workflow', desc: 'Draft \u2192 In Review \u2192 Final Review \u2192 Ready to Send \u2192 Sent. Clear ownership at every stage. Nothing reaches investors without sign-off.' },
            { icon: I.edit(C.accent), title: 'Section-Level Editing', desc: 'Edit any section manually or regenerate with AI instructions. Change one paragraph without touching the rest. The AI proposes, you dispose.' },
            { icon: I.mail(C.accent), title: 'PDF, HTML & Email Export', desc: 'Server-side PDF rendering. Standalone HTML files. One-click email-ready HTML — paste directly into Gmail, Outlook, or Apple Mail with charts intact.' },
            { icon: I.sliders(C.accent), title: 'Complete Customization', desc: 'Choose sections, reorder with drag-and-drop, set brand colors, upload your logo, add your disclaimer. Your report, your way.' },
          ].map((b, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="hover-lift" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 20px', height: '100%', cursor: 'default' }}>
                <div style={{ marginBottom: 12 }}>{b.icon}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{b.title}</div>
                <P style={{ fontSize: 13.5 }}>{b.desc}</P>
              </div>
            </FadeIn>))}
        </div>
      </Sec>

      {/* ═══ PERSONAS ═══ */}
      <Sec bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}><Tag>Who It&apos;s For</Tag><H2>If your firm owes investors a report,<br /><em>this is for you</em></H2></div></FadeIn>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48 }}>
          <FadeIn delay={0.08}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.darkMid, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>The Decision-Maker</div>
              <H3>James — Managing Partner</H3>
              <P style={{ marginTop: 10, fontSize: 14.5 }}>Raised Fund III at $180M. Manages 28 properties across three markets. His institutional LP expects inline charts, risk matrices, and 30-60-90 action plans. He needs CBRE-quality output without a $150K reporting analyst.</P>
              <div style={{ marginTop: 16, padding: '12px 14px', background: `${C.darkMid}08`, borderRadius: 10, borderLeft: `3px solid ${C.darkMid}40`, fontFamily: 'DM Sans', fontSize: 14, color: C.darkMid, fontStyle: 'italic' }}>&ldquo;I need a tool. Not another headcount.&rdquo;</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.16}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, height: '100%' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>The User</div>
              <H3>Marcus — VP, Asset Management</H3>
              <P style={{ marginTop: 10, fontSize: 14.5 }}>Manages 12 properties, oversees 16 more. Spends 60 hours per quarter on report production — formatting charts, fixing fonts, screenshotting Excel into Word. Wants to spend his time doing actual asset management.</P>
              <div style={{ marginTop: 16, padding: '12px 14px', background: `${C.accent}06`, borderRadius: 10, borderLeft: `3px solid ${C.accent}40`, fontFamily: 'DM Sans', fontSize: 14, color: C.accentD, fontStyle: 'italic' }}>&ldquo;I want to manage assets — not format Word documents.&rdquo;</div>
            </div>
          </FadeIn>
        </div>
      </Sec>

      {/* ═══ PRICING ═══ */}
      <Sec id="pricing" bg={C.bgAlt}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}><Tag>Pricing</Tag><H2>Per property. Cancel anytime.<br /><em>No long-term contracts.</em></H2><P style={{ marginTop: 14 }}>Start free with 2 properties. Scale when you are ready.</P></div></FadeIn>
        <FadeIn delay={0.1}>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 }}>
            {[
              { tier: 'Foundational', price: '$75', desc: 'Core reporting for smaller portfolios', features: ['4 report sections','Executive Summary, Revenue, Expense, Outlook','KPI cards with MoM changes','Your brand colors & logo','PDF & HTML export','1 user'], color: C.textSoft, featured: false },
              { tier: 'Professional', price: '$299', desc: 'Full-featured for growing firms', features: ['10 report sections','Everything in Foundational, plus:','Occupancy, Revenue Analysis, Expense Analysis','NOI Performance, Rent Roll, Risk & Watch Items','Budget variance analysis','Email-ready HTML export','Up to 3 users'], color: C.accent, featured: true },
              { tier: 'Institutional', price: '$750', desc: 'Enterprise-grade for institutional LPs', features: ['Up to 15 report sections','Everything in Professional, plus:','Investment Thesis Update','Lease Expiration & Rollover','Risk Matrix (severity-rated)','Strategic 30/60/90 Outlook','Budget vs. Actual deep dive','Up to 10 users'], color: C.navy, featured: false },
            ].map((p, i) => (
              <div key={i} style={{ background: C.bg, border: `1px solid ${p.featured ? C.accent + '40' : C.border}`, borderRadius: 16, padding: '28px 24px', position: 'relative', boxShadow: p.featured ? `0 8px 32px ${C.accent}12` : 'none' }}>
                {p.featured && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: '#fff', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 100, letterSpacing: '0.04em' }}>MOST POPULAR</div>}
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.tier}</div>
                <div style={{ fontFamily: "'Newsreader', serif", fontSize: 40, fontWeight: 500, color: C.text, marginTop: 8 }}>{p.price}<span style={{ fontSize: 14, color: C.textMuted, fontFamily: 'DM Sans' }}>/property/mo</span></div>
                <P style={{ fontSize: 13, marginTop: 4 }}>{p.desc}</P>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'DM Sans', fontSize: 13, color: f.startsWith('Everything') ? C.accent : C.textMid, fontWeight: f.startsWith('Everything') ? 600 : 400, lineHeight: 1.4 }}>
                      {!f.startsWith('Everything') && <span style={{ flexShrink: 0, marginTop: 1 }}>{I.check(p.color)}</span>}{f}
                    </div>))}
                </div>
                <div style={{ marginTop: 24 }}>
                  <Btn href={dashboardHref} primary={p.featured} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '12px 20px' }}>{p.featured ? (isSignedIn ? 'Go to Dashboard' : 'Start Free Trial') : 'Get Started'}</Btn>
                </div>
              </div>))}
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ FAQ ═══ */}
      <Sec id="faq" bg={C.bg}>
        <FadeIn><div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto 40px' }}><Tag>FAQ</Tag><H2>The questions your<br /><em>compliance team will ask</em></H2></div></FadeIn>
        <FadeIn delay={0.1}><div style={{ maxWidth: 700, margin: '0 auto' }}><FAQSection items={faq} /></div></FadeIn>
      </Sec>

      {/* ═══ FINAL CTA ═══ */}
      <Sec id="get-started" bg={C.bgAlt} style={{ paddingBottom: 112 }}>
        <FadeIn>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto', padding: '52px 36px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 380, height: 380, background: `radial-gradient(circle, ${C.accent}08 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <H2>Try it on your most<br /><em>scrutinized property</em></H2>
              <P style={{ marginTop: 16, maxWidth: 460, margin: '16px auto 0' }}>Upload a real T-12 for a property your LP asks about most. Generate the report. If it is not better than what your team produces manually, you lost 5 minutes.</P>
              <div style={{ marginTop: 28 }}><Btn href={dashboardHref} primary style={{ fontSize: 16, padding: '14px 34px' }}>{ctaLabel}</Btn></div>
              <div style={{ marginTop: 16, fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>Free tier · 2 properties · No credit card required</div>
            </div>
          </div>
        </FadeIn>
      </Sec>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: `1px solid ${C.borderL}`, padding: '36px 24px', background: C.bgWarm }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#fff' }}>W</div>
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 17, fontWeight: 500, color: C.text }}>WriteUp AI</span>
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted }}>The investor reporting platform for multifamily PE.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy','Terms','Contact'].map(t => <a key={t} href="#" style={{ fontFamily: 'DM Sans', fontSize: 13, color: C.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}>{t}</a>)}
          </div>
        </div>
      </footer>
    </div>
  )
}

