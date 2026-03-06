// app/dashboard/welcome/welcome-client.tsx
// WriteUp AI — Onboarding Funnel Client Component (All 6 Screens)
// ALL inline styles. No Tailwind. No emojis. SVG icons only.

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════
// Design System
// ═══════════════════════════════════════════════════════════

const W = {
  accent: "#00B7DB",
  accentDark: "#0099B8",
  bg: "#FFFFFF",
  bgAlt: "#F7F5F1",
  bgWarm: "#FAF9F7",
  text: "#1A1A1A",
  textMid: "#4A4A4A",
  textSoft: "#7A7A7A",
  textMuted: "#A3A3A3",
  border: "#E8E5E0",
  borderL: "#F0EDE8",
  green: "#29581D",
  greenBg: "#F0F7ED",
  navy: "#002D5F",
  navyBg: "#F0F4F9",
  gold: "#B8960F",
  goldBg: "#FBF8EF",
  red: "#CC0000",
};

const F = {
  display: "'Newsreader','Georgia',serif",
  body: "'DM Sans','Helvetica Neue',sans-serif",
};

// ═══════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════

const PRESETS = [
  { name: "Bold Burgundy", primary: "#7b2d3b", secondary: "#fefcf9", accent: "#d4a04a" },
  { name: "Corporate Navy", primary: "#1B2A4A", secondary: "#F0F4F9", accent: "#C8A951" },
  { name: "Modern Teal", primary: "#0D4F4F", secondary: "#F0FAF9", accent: "#00B7DB" },
  { name: "Classic Charcoal", primary: "#27272A", secondary: "#EFF6FF", accent: "#2563EB" },
  { name: "Forest Professional", primary: "#1A3A2A", secondary: "#F5F7F2", accent: "#4A8C5C" },
  { name: "Slate & Emerald", primary: "#334155", secondary: "#F0FDF4", accent: "#059669" },
];

const ALL_SECTIONS = [
  { id: "executive_summary", title: "Executive Summary", desc: "High-level overview with KPI cards — NOI, revenue, occupancy, expenses — with month-over-month trends and budget variance.", tier: "foundational", viz: "KPI Cards", vizD: "4–5 key metric cards with trend indicators" },
  { id: "occupancy_leasing", title: "Occupancy & Leasing", desc: "Physical vs. economic occupancy, move-in/out velocity, renewal rates, and concession trends.", tier: "professional", viz: "Chart", vizD: "Occupancy gauge with physical vs. economic comparison" },
  { id: "revenue_analysis", title: "Revenue Analysis", desc: "GPR-to-EGI waterfall — every deduction itemized: vacancy, concessions, bad debt, other income.", tier: "professional", viz: "Chart", vizD: "Revenue waterfall chart: GPR to total revenue bridge" },
  { id: "expense_analysis", title: "Expense Analysis", desc: "Category-by-category breakdown ranked by dollar impact with budget variance and MoM change.", tier: "professional", viz: "Chart", vizD: "Horizontal bar chart ranking categories by dollar amount" },
  { id: "noi_performance", title: "Net Operating Income", desc: "Actual vs. budget vs. prior month, margin analysis, per-unit metrics, trailing 12-month trend. All analysis stops at NOI.", tier: "professional", viz: "Chart", vizD: "12-month NOI trend bars with current month highlighted" },
  { id: "rent_roll_insights", title: "Rent Roll Insights", desc: "Unit mix, average rent by floorplan, market vs. effective rent, lease expiration concentration.", tier: "professional", viz: "Chart", vizD: "Unit mix table with rent comparison by floorplan" },
  { id: "market_positioning", title: "Market Positioning", desc: "Submarket context, competitive positioning, and rent growth trends from questionnaire and market data.", tier: "professional", viz: "—" },
  { id: "capital_improvements", title: "Capital & Improvements", desc: "Active/completed projects with cost tracking and ROI. Only appears when you provide capex details.", tier: "professional", viz: "Conditional", vizD: "Generated only when you provide capital project information" },
  { id: "risk_watch_items", title: "Risk & Watch Items", desc: "Data-driven risk flags with severity ratings — delinquency, expense spikes, occupancy, market headwinds.", tier: "professional", viz: "Table", vizD: "Severity-rated risk table with trend arrows" },
  { id: "asset_manager_outlook", title: "Asset Manager Outlook", desc: "30-60-90 day strategic narrative from your questionnaire responses and property context.", tier: "foundational", viz: "—" },
  { id: "investment_thesis_update", title: "Investment Thesis Update", desc: "Performance tracking against your original acquisition thesis.", tier: "institutional", viz: "Premium", vizD: "Thesis tracking dashboard — Institutional tier" },
  { id: "lease_expiration_rollover", title: "Lease Expiration & Rollover", desc: "12-month expiration calendar, revenue-at-risk analysis, rollover probability.", tier: "institutional", viz: "Premium", vizD: "Expiration bar chart with revenue overlay — Institutional tier" },
  { id: "rent_roll_deep_dive", title: "Rent Roll Deep Dive", desc: "Distribution histogram, loss-to-lease, unit-level profitability, floorplan comparison.", tier: "institutional", viz: "Premium", vizD: "Histogram and comparison tables — Institutional tier" },
  { id: "budget_vs_actual", title: "Budget vs. Actual", desc: "Line-by-line variance with dollar/percentage delta and YTD tracking. Requires budget upload.", tier: "institutional", viz: "Conditional", vizD: "Generated only when you upload a budget file" },
  { id: "market_submarket_analysis", title: "Market & Submarket Analysis", desc: "Comparable properties, rent comps, supply pipeline, and absorption trends.", tier: "institutional", viz: "Chart", vizD: "Comps table and market trend charts" },
];

const FREE_IDS = ["executive_summary", "occupancy_leasing", "revenue_analysis", "expense_analysis", "noi_performance"];

const PRICING = {
  foundational: { monthly: 75, quarterly: 207, yearly: 747 },
  professional: { monthly: 299, quarterly: 825, yearly: 2978 },
  institutional: { monthly: 750, quarterly: 2070, yearly: 7470 },
};

type BillingCycle = "monthly" | "quarterly" | "yearly";
const DISC: Record<BillingCycle, number> = { monthly: 0, quarterly: 8, yearly: 17 };

function perMo(tier: keyof typeof PRICING, cycle: BillingCycle): number {
  const p = PRICING[tier][cycle];
  if (cycle === "monthly") return p;
  if (cycle === "quarterly") return Math.round(p / 3);
  return Math.round(p / 12);
}

// ═══════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════

function TopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: W.bg, borderBottom: `1px solid ${W.borderL}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 700, fontSize: 13, color: "#fff" }}>W</div>
        <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: W.text }}>WriteUp AI</span>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: W.goldBg, border: `1px solid ${W.gold}20`, color: W.gold }}>Complimentary Report</div>
    </div>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 0" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 100, background: i === current ? W.accent : i < current ? W.green : W.borderL, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

function Btn({ children, onClick, gradient, full = true, disabled }: { children: React.ReactNode; onClick?: () => void; gradient?: boolean; full?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
      width: full ? "100%" : "auto", padding: "16px 36px",
      background: disabled ? W.textMuted : gradient ? `linear-gradient(135deg,${W.accent},${W.accentDark})` : W.accent,
      color: "#fff", border: "none", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: F.body, fontSize: 16, fontWeight: 600,
      boxShadow: disabled ? "none" : `0 4px 20px ${W.accent}30`, transition: "all 0.2s",
      opacity: disabled ? 0.6 : 1,
    }}>
      {children}
    </button>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ textAlign: "center", marginTop: 10 }}>
      <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 13, color: W.textMuted }}>
        ← Back
      </button>
    </div>
  );
}

function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

function Ic({ d, c = W.accent, s = 16 }: { d: string; c?: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

function CheckIcon({ color = W.green, size = 12 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}

// ═══════════════════════════════════════════════════════════
// Modal
// ═══════════════════════════════════════════════════════════

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: W.bg, borderRadius: 18, maxWidth: 580, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${W.borderL}`, position: "sticky", top: 0, background: W.bg, zIndex: 1, borderRadius: "18px 18px 0 0" }}>
          <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 500, color: W.text }}>{title}</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: W.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Live Report Preview
// ═══════════════════════════════════════════════════════════

function ReportPreview({ preset, propertyName, companyName, sections }: { preset: number; propertyName: string; companyName: string; sections?: string[] }) {
  const p = PRESETS[preset] || PRESETS[0];
  const secs = sections || FREE_IDS;
  const secData = ALL_SECTIONS.filter((s) => secs.includes(s.id));

  return (
    <div style={{ border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden", background: "#fff", fontSize: 10, fontFamily: F.body, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      {/* Header bar */}
      <div style={{ background: p.primary, padding: "12px 16px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: F.display }}>{propertyName || "Riverstone at Meadow Creek"}</div>
            <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>March 2026 — Monthly Asset Report</div>
          </div>
          <div style={{ fontSize: 8, opacity: 0.7, textAlign: "right" }}>{companyName || "Walker Capital Group"}</div>
        </div>
      </div>
      {/* Accent stripe */}
      <div style={{ height: 3, background: p.accent }} />
      {/* KPI bar */}
      <div style={{ display: "flex", gap: 1, padding: "6px 8px", background: p.secondary }}>
        {["NOI", "Revenue", "Expenses", "Margin", "Occ."].map((k, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "4px 2px" }}>
            <div style={{ fontSize: 8, color: W.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.primary, fontFamily: F.display }}>—</div>
          </div>
        ))}
      </div>
      {/* Sections */}
      <div style={{ padding: "8px 10px" }}>
        {secData.map((s, i) => (
          <div key={s.id} style={{ padding: "6px 0", borderBottom: i < secData.length - 1 ? `1px solid ${W.borderL}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <div style={{ width: 2, height: 10, background: p.accent, borderRadius: 1 }} />
              <span style={{ fontWeight: 600, color: W.text, fontSize: 9 }}>{s.title}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 6 }}>
              {[0.95, 0.88, 0.72].map((w, j) => <div key={j} style={{ height: 3, background: W.borderL, borderRadius: 2, width: `${w * 100}%` }} />)}
            </div>
            {s.viz !== "—" && s.viz !== "Conditional" && (
              <div style={{ marginTop: 4, marginLeft: 6, height: 20, borderRadius: 4, background: `${p.accent}12`, border: `1px solid ${p.accent}15` }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", borderTop: `1px solid ${W.borderL}`, textAlign: "center", fontSize: 8, color: W.textMuted }}>
        Est. {secData.length <= 4 ? "4–6" : "8–12"} pages
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Modal Content Helpers
// ═══════════════════════════════════════════════════════════

function ModalIconRow({ icon, title, desc, iconColor, iconBg, borderColor }: { icon: string; title: string; desc: string; iconColor?: string; iconBg?: string; borderColor?: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || `${W.accent}08`, border: `1px solid ${borderColor || `${W.accent}15`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic d={icon} c={iconColor || W.accent} s={15} />
      </div>
      <div>
        <div style={{ fontWeight: 600, color: W.text, marginBottom: 2, fontFamily: F.body, fontSize: 13 }}>{title}</div>
        <div style={{ color: W.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 1: THE HOOK
// ═══════════════════════════════════════════════════════════

function Screen1({ onNext }: { onNext: () => void }) {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <div>
      <TopBar />
      <div style={{ padding: "44px 44px 0" }}>
        <Dots current={0} total={6} />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: F.display, fontSize: 38, fontWeight: 500, color: W.text, lineHeight: 1.15, marginBottom: 10, letterSpacing: "-0.02em" }}>
            Reporting quality is the #1 factor<br /><span style={{ color: W.accent }}>investors use to evaluate your firm</span>
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 15, color: W.textSoft, lineHeight: 1.6, maxWidth: 540, margin: "0 auto" }}>
            We built a proprietary analysis engine specifically for multifamily PE — with math verification no analyst or general-purpose AI can replicate.{" "}
            <button onClick={() => setModal("research")} style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", textDecoration: "underline", padding: 0 }}>See the research</button>
          </p>
        </div>

        {/* Label */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.accent, background: `${W.accent}08`, padding: "6px 14px", borderRadius: 8, border: `1px solid ${W.accent}15` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Here&apos;s how we&apos;ll create your complimentary report
          </span>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "row", gap: 0, marginBottom: 20, background: W.bgAlt, borderRadius: 16, border: `1px solid ${W.border}`, overflow: "hidden" }}>
          {[
            { num: "1", time: "30 sec", title: "Set up your property", desc: "Name, address, and unit count. Subscribers also store budgets and investment strategy — once.", mKey: "step1",
              ic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
            { num: "2", time: "3 min", title: "Upload T-12 & answer guided questions", desc: "We extract every line item automatically — no manual entry.", mKey: "step2",
              ic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg> },
            { num: "3", time: "~90 sec", title: "Our engine analyzes & verifies", desc: "Purpose-built for multifamily. Three-layer math verification — zero financial errors.", mKey: "math",
              ic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "20px 22px", background: W.bg, borderRight: i < 2 ? `1px solid ${W.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.ic}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>{s.title}</div>
                </div>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: W.textMuted, background: W.bgAlt, padding: "3px 8px", borderRadius: 6 }}>{s.time}</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.5, marginBottom: 4 }}>{s.desc}</div>
              <button onClick={() => setModal(s.mKey)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, padding: 0, textDecoration: "underline" }}>{i === 2 ? "How math verification works" : "Learn more"}</button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: W.bgAlt, border: `1px solid ${W.border}` }}>
          <span style={{ fontFamily: F.body, fontSize: 12, color: W.textMid }}>
            <strong style={{ color: W.text }}>Under 5 minutes.</strong> The same report takes 6–8 hours using Excel, Word, and ChatGPT — with no math verification.
          </span>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16, fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.6 }}>
          WriteUp AI is a complete reporting platform — generate, review, edit, collaborate, and export.{" "}
          <button onClick={() => setModal("platform")} style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", padding: 0, textDecoration: "underline" }}>Explore your reporting platform</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16, fontFamily: F.body, fontSize: 10, color: W.textMuted }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          End-to-end encryption. Row-level data isolation. Your financials stay private.
        </div>

        <div style={{ maxWidth: 420, margin: "0 auto", paddingBottom: 44 }}>
          <Btn onClick={onNext}>Show Me What&apos;s Included <ArrowIcon /></Btn>
        </div>
      </div>

      {/* Modals */}
      {modal === "research" && (
        <Modal title="The Research" onClose={() => setModal(null)}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
            {[
              { ic: "M12 20V10M18 20V4M6 20v-4", t: "74% of institutional LPs", d: "rank reporting quality as their #1 criterion when selecting a fund manager — above past performance." },
              { ic: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 7a4 4 0 11-8 0 4 4 0 018 0z", t: "92% investor retention", d: "Origin Investments attributes this directly to the quality of its quarterly reporting." },
              { ic: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1", t: "Real cost of bad reports", d: "Lost trust, failed re-ups, and slower fundraising. Firms that treat reporting as a competitive advantage consistently outperform on capital retention." },
            ].map((r, i) => (
              <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none" }}>
                <ModalIconRow icon={r.ic} title={r.t} desc={r.d} />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === "step1" && (
        <Modal title="Property Setup" onClose={() => setModal(null)}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 14 }}>For your complimentary report, we just need the basics. As a subscriber, your property profile stores everything:</p>
            {[
              { ic: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", t: "Investment Strategy", d: "Define your value-add thesis once. Every report tracks performance against it." },
              { ic: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", t: "Budget Upload", d: "Upload once per year. Every report includes automatic budget vs. actual variance." },
              { ic: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", t: "One-Click Monthly", d: "Settings persist. Next month: upload T-12, click Generate. Done." },
            ].map((r, i) => (
              <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none" }}>
                <ModalIconRow icon={r.ic} title={r.t} desc={r.d} />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === "step2" && (
        <Modal title="Data Extraction" onClose={() => setModal(null)}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
            {[
              { ic: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", t: "Source Data Registry", d: "We parse your T-12 and build a canonical set of verified values — the single source of truth for every section." },
              { ic: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", t: "PDF, Excel, or CSV", d: "Drop in whatever format you have. Revenue and expense line items are extracted automatically." },
              { ic: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01", t: "Dynamic Questionnaire", d: "Questions adapt to your enabled sections. Disable Capital Improvements — the related question disappears." },
            ].map((r, i) => (
              <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none" }}>
                <ModalIconRow icon={r.ic} title={r.t} desc={r.d} />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === "math" && (
        <Modal title="Three-Layer Math Verification" onClose={() => setModal(null)}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 12 }}>Every calculation is independently verified. <strong>Zero AI hallucinations. Zero financial errors. Guaranteed.</strong></p>
            {[
              { ic: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", t: "Layer 1 — Input Verification", d: "Every input traced to your source documents." },
              { ic: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", t: "Layer 2 — Formula Verification", d: "15+ registered formulas checked (NOI, EGI, DSCR, etc.)." },
              { ic: "M12 20V10M18 20V4M6 20v-4", t: "Layer 3 — Arithmetic Verification", d: "Every formula re-computed by deterministic math engine." },
            ].map((r, i) => (
              <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none" }}>
                <ModalIconRow icon={r.ic} title={r.t} desc={r.d} iconColor={W.green} iconBg={W.greenBg} borderColor={`${W.green}20`} />
              </div>
            ))}
            <div style={{ padding: "12px 14px", borderRadius: 10, background: W.greenBg, border: `1px solid ${W.green}20`, marginTop: 12 }}>
              <div style={{ fontWeight: 600, color: W.green, marginBottom: 2 }}>Full Audit Trail</div>
              <div style={{ color: W.textMid, fontSize: 12 }}>Expand any section in the report viewer to see every correction — original value, corrected value, confidence level. Complete transparency.</div>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, fontStyle: "italic", color: W.textSoft }}>This verification is proprietary to WriteUp AI. It is not available in any general-purpose AI tool.</p>
          </div>
        </Modal>
      )}

      {modal === "platform" && (
        <Modal title="Your Reporting Platform" onClose={() => setModal(null)}>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", padding: "4px 0" }}>
              {["Draft", "In Review", "Final Review", "Ready to Send", "Delivered"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div style={{ padding: "5px 10px", borderRadius: 8, background: i === 4 ? W.greenBg : i === 3 ? W.goldBg : `${W.accent}08`, border: `1px solid ${i === 4 ? W.green : i === 3 ? W.gold : W.accent}20`, fontFamily: F.body, fontSize: 10, fontWeight: 600, color: i === 4 ? W.green : i === 3 ? W.gold : W.accent, whiteSpace: "nowrap" }}>{s}</div>
                  {i < 4 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                </div>
              ))}
            </div>
            {[
              { ic: "M13 10V3L4 14h7v7l9-11h-7z", t: "Generate", d: "Upload T-12, answer questions, get a report in under 2 minutes." },
              { ic: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", t: "Review & Edit", d: "Edit inline. Regenerate with instructions. Control paragraph length." },
              { ic: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0", t: "Collaborate", d: "Team members with roles. Analysts draft, managers review, partners approve." },
              { ic: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343", t: "Brand & Configure", d: "Your logo, colors, disclaimers. Section order and length. Set once, generate consistently." },
              { ic: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", t: "Export", d: "PDF, HTML, or rich HTML for email clients. Ready for your IR platform." },
              { ic: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8", t: "Archive", d: "Reports stored chronologically. Full history by property, every month." },
            ].map((r, i) => (
              <div key={i} style={{ borderBottom: i < 5 ? `1px solid ${W.borderL}` : "none" }}>
                <ModalIconRow icon={r.ic} title={r.t} desc={r.d} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 2: VALUE STACK
// ═══════════════════════════════════════════════════════════

function Screen2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };
  const pro = ALL_SECTIONS.filter((s) => s.tier !== "institutional");
  const inst = ALL_SECTIONS.filter((s) => s.tier === "institutional");

  return (
    <div>
      <TopBar />
      <div style={{ padding: "44px 44px 0" }}>
        <Dots current={1} total={6} />
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, color: W.text, lineHeight: 1.2, marginBottom: 8 }}>What&apos;s inside your report</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, maxWidth: 540, margin: "0 auto" }}>
            Professional subscribers get up to 10 sections with charts. Your complimentary report includes 5 of these — enough to experience the depth and quality firsthand.
          </p>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: `${W.accent}06`, border: `1px solid ${W.accent}12`, marginBottom: 14, fontFamily: F.body, fontSize: 12, color: W.textMid, lineHeight: 1.6 }}>
            <strong style={{ color: W.text }}>Full control when you subscribe:</strong> Choose sections, drag to reorder, set paragraph length, add disclaimers. Configure once — every report follows your template.
          </div>

          {/* Toggle tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: W.goldBg, border: `1px solid ${W.gold}20`, textAlign: "center", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.gold }}>
              Generating now — 5 sections
            </div>
            <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: W.bgAlt, border: `1px solid ${W.border}`, textAlign: "center", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textSoft }}>
              All 15 sections — expand to explore
            </div>
          </div>

          {pro.map((s) => {
            const free = FREE_IDS.includes(s.id);
            const open = expanded.has(s.id);
            return (
              <div key={s.id} onClick={() => toggle(s.id)} style={{ padding: "11px 14px", cursor: "pointer", borderBottom: `1px solid ${W.borderL}`, background: free ? `${W.gold}04` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckIcon color={free ? W.gold : W.accent} size={14} />
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, flex: 1 }}>{s.title}</span>
                  {s.viz !== "—" && (
                    <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, color: s.viz === "Conditional" ? W.gold : W.accent, background: s.viz === "Conditional" ? W.goldBg : `${W.accent}08`, padding: "2px 6px", borderRadius: 4, border: `1px solid ${s.viz === "Conditional" ? `${W.gold}20` : `${W.accent}15`}` }}>{s.viz}</span>
                  )}
                  {free && (
                    <span style={{ fontFamily: F.body, fontSize: 8, fontWeight: 700, color: W.green, background: W.greenBg, padding: "2px 7px", borderRadius: 4, border: `1px solid ${W.green}20`, textTransform: "uppercase", letterSpacing: "0.04em" }}>Included</span>
                  )}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                {open && (
                  <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.6 }}>
                    {s.desc}
                    {s.vizD && <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: W.bg, border: `1px solid ${W.borderL}`, fontSize: 11, color: W.textMid }}><strong>Visualization:</strong> {s.vizD}</div>}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.navy, textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 0 4px", marginTop: 6 }}>Institutional — 5 additional</div>
          {inst.map((s) => {
            const open = expanded.has(s.id);
            return (
              <div key={s.id} onClick={() => toggle(s.id)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${W.borderL}`, opacity: 0.65 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckIcon color={W.navy} size={14} />
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, flex: 1 }}>{s.title}</span>
                  <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, color: W.navy, background: W.navyBg, padding: "2px 6px", borderRadius: 4 }}>{s.viz}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                {open && (
                  <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.6 }}>
                    {s.desc}
                    {s.vizD && <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: W.bg, border: `1px solid ${W.borderL}`, fontSize: 11, color: W.textMid }}><strong>Visualization:</strong> {s.vizD}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth: 420, margin: "20px auto 0", paddingBottom: 44 }}>
          <Btn onClick={onNext}>Next: See the Plans <ArrowIcon /></Btn>
          <Back onClick={onBack} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 3: PLANS
// ═══════════════════════════════════════════════════════════

function Screen3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div>
      <TopBar />
      <div style={{ padding: "44px 44px 0" }}>
        <Dots current={2} total={6} />
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, color: W.text, lineHeight: 1.2, marginBottom: 6 }}>
            <span style={{ color: W.accent }}>The right plan</span> for your firm
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, maxWidth: 520, margin: "0 auto" }}>
            Same engine. Same math verification. Same export quality. The difference is analysis depth, customization, and team size.
          </p>
        </div>

        <BillingToggle cycle={cycle} onChange={setCycle} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 800, margin: "0 auto" }}>
          {[
            { tier: "foundational" as const, name: "Foundational", tag: "Your free report", tagC: W.gold, tagBg: W.goldBg, items: ["4 report sections", "T-12 analysis", "Proprietary math verification", "PDF, HTML & email-ready export", "1 user"] },
            { tier: "professional" as const, name: "Professional", tag: "Most popular", tagC: W.accent, tagBg: `${W.accent}10`, featured: true, items: ["10 sections + inline charts", "T-12 + rent roll analysis", "Budget vs. actual variance", "Custom branding & section builder", "Report pipeline + approval stages", "Editable sections with AI regen", "3 team members"] },
            { tier: "institutional" as const, name: "Institutional", tag: "Enterprise", tagC: W.navy, tagBg: W.navyBg, items: ["15 sections — full depth", "Everything in Professional", "Investment thesis tracking", "Custom templates + API", "10 team members", "Dedicated account manager"] },
          ].map((plan, i) => (
            <PlanCard key={i} plan={plan} cycle={cycle} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 8, fontFamily: F.body, fontSize: 11, color: W.textMuted }}>Per-property pricing. Upgrade or cancel anytime. Not choosing now.</div>

        <div style={{ maxWidth: 420, margin: "16px auto 0", paddingBottom: 44 }}>
          <Btn onClick={onNext}>Build My Report <ArrowIcon /></Btn>
          <Back onClick={onBack} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Shared Plan Components (used on Screen 3 and Screen 6)
// ═══════════════════════════════════════════════════════════

function BillingToggle({ cycle, onChange, compact }: { cycle: BillingCycle; onChange: (c: BillingCycle) => void; compact?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: compact ? 12 : 18 }}>
      {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((c) => (
        <button key={c} onClick={() => onChange(c)} style={{
          padding: compact ? "6px 12px" : "7px 14px", borderRadius: 8, cursor: "pointer",
          fontFamily: F.body, fontSize: compact ? 11 : 12, fontWeight: cycle === c ? 600 : 500,
          background: cycle === c ? W.accent : "transparent", color: cycle === c ? "#fff" : W.textMid,
          border: cycle === c ? "none" : `1px solid ${W.border}`,
        }}>
          {c.charAt(0).toUpperCase() + c.slice(1)}
          {DISC[c] > 0 && (
            <span style={{ marginLeft: 4, fontSize: compact ? 9 : 10, fontWeight: 700, color: cycle === c ? "#fff" : W.green, background: cycle === c ? "rgba(255,255,255,0.2)" : W.greenBg, padding: "1px 5px", borderRadius: 4 }}>-{DISC[c]}%</span>
          )}
        </button>
      ))}
    </div>
  );
}

function PlanCard({ plan, cycle, compact }: { plan: { tier: keyof typeof PRICING; name: string; tag: string; tagC: string; tagBg: string; featured?: boolean; items: string[] }; cycle: BillingCycle; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? 14 : 20, borderRadius: 14, background: W.bg, border: plan.featured ? `2px solid ${W.accent}` : `1px solid ${W.border}` }}>
      <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: plan.tagBg, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: plan.tagC, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, border: `1px solid ${plan.tagC}15` }}>{plan.tag}</div>
      <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.textMid, marginBottom: 2 }}>{plan.name}</div>
      <div style={{ fontFamily: F.display, fontSize: compact ? 20 : 24, fontWeight: 600, color: W.text, marginBottom: 2 }}>
        ${perMo(plan.tier, cycle)}<span style={{ fontSize: compact ? 11 : 12, fontWeight: 400, color: W.textSoft }}>/prop/mo</span>
      </div>
      {cycle !== "monthly" && (
        <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginBottom: 6 }}>
          <span style={{ textDecoration: "line-through" }}>${PRICING[plan.tier].monthly}</span>
          <span style={{ marginLeft: 4, color: W.green, fontWeight: 600 }}>Save {DISC[cycle]}%</span>
        </div>
      )}
      {cycle === "monthly" && <div style={{ height: 6 }} />}
      {plan.items.map((item, j) => (
        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0" }}>
          <CheckIcon color={W.green} size={12} />
          <span style={{ fontFamily: F.body, fontSize: 11, color: W.textMid, lineHeight: 1.4, marginTop: -1 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 4: UPLOAD + COLORS + PREVIEW
// ═══════════════════════════════════════════════════════════

function Screen4({ onNext, onBack, formData, setFormData }: {
  onNext: () => void; onBack: () => void;
  formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const t12InputRef = useRef<HTMLInputElement>(null);
  const rrInputRef = useRef<HTMLInputElement>(null);

  const handleT12 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, t12File: file }));
  };
  const handleRR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, rentRollFile: file }));
  };

  const canProceed = formData.propertyName.trim() && formData.unitCount.trim() && formData.t12File;

  return (
    <div>
      <TopBar />
      <div style={{ padding: "40px 40px 0" }}>
        <Dots current={3} total={6} />
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 500, color: W.text, marginBottom: 4 }}>Your property, your brand</h2>
            <p style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft }}>Subscribers get 20+ color themes and full branding. Pick from our most popular for now.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
            {/* Left: form */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Property fields */}
              <div style={{ background: W.bgAlt, borderRadius: 12, padding: 18, border: `1px solid ${W.border}`, marginBottom: 12 }}>
                <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Property</div>
                {[
                  { l: "Property Name *", p: "e.g. The Heights at Montrose", k: "propertyName" as const },
                  { l: "Unit Count *", p: "e.g. 312", k: "unitCount" as const },
                  { l: "Address", p: "4500 Montrose Blvd, Houston, TX 77006", k: "address" as const },
                  { l: "Company Name", p: "e.g. Walker Capital Group", k: "companyName" as const },
                ].map((f, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 3 }}>{f.l}</label>
                    <input
                      value={formData[f.k] as string}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [f.k]: e.target.value }))}
                      placeholder={f.p}
                      type={f.k === "unitCount" ? "number" : "text"}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 12, color: W.text, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>

              {/* Colors */}
              <div style={{ background: W.bgAlt, borderRadius: 12, padding: 18, border: `1px solid ${W.border}`, marginBottom: 12 }}>
                <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Report Colors</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {PRESETS.map((p, i) => (
                    <button key={i} onClick={() => setFormData((prev) => ({ ...prev, preset: i }))} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6,
                      border: formData.preset === i ? `2px solid ${W.accent}` : `1px solid ${W.border}`,
                      background: formData.preset === i ? `${W.accent}06` : W.bg, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", gap: 1 }}>
                        {[p.primary, p.secondary, p.accent].map((c, j) => (
                          <div key={j} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: j === 1 ? `1px solid ${W.borderL}` : "none" }} />
                        ))}
                      </div>
                      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: formData.preset === i ? 600 : 500, color: formData.preset === i ? W.text : W.textSoft }}>{p.name}</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted }}>20+ themes available in every subscription</div>
              </div>

              {/* T-12 Upload */}
              <input ref={t12InputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleT12} style={{ display: "none" }} />
              <div onClick={() => t12InputRef.current?.click()} style={{
                border: `2px dashed ${formData.t12File ? W.green : W.accent}40`, borderRadius: 12,
                padding: 24, textAlign: "center",
                background: formData.t12File ? W.greenBg : `${W.accent}03`, marginBottom: 8, cursor: "pointer",
              }}>
                {formData.t12File ? (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}><polyline points="20 6 9 17 4 12" /></svg>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>{formData.t12File.name}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginTop: 2 }}>Click to replace</div>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5" style={{ marginBottom: 6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>Upload T-12 <span style={{ color: W.red }}>*</span></div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginTop: 2 }}>PDF, Excel, or CSV</div>
                  </>
                )}
              </div>

              {/* Rent Roll Upload */}
              <input ref={rrInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleRR} style={{ display: "none" }} />
              <div onClick={() => rrInputRef.current?.click()} style={{ border: `1px dashed ${formData.rentRollFile ? W.green : W.border}`, borderRadius: 10, padding: 16, textAlign: "center", background: formData.rentRollFile ? W.greenBg : W.bgWarm, marginBottom: 12, cursor: "pointer" }}>
                {formData.rentRollFile ? (
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.green }}>{formData.rentRollFile.name}</div>
                ) : (
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.textMid }}>Rent Roll <span style={{ fontWeight: 400, color: W.textMuted }}>(optional)</span></div>
                )}
              </div>
            </div>

            {/* Right: live preview */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, textAlign: "center" }}>Live Preview</div>
              <ReportPreview preset={formData.preset} propertyName={formData.propertyName} companyName={formData.companyName} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 10, color: W.textSoft, marginTop: 8, marginBottom: 20 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            Encrypted. Row-level security. Your data stays private.
          </div>

          <Btn onClick={onNext} disabled={!canProceed}>Next: Guided Questions <ArrowIcon /></Btn>
          <Back onClick={onBack} />
          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 5: GUIDED QUESTIONS
// ═══════════════════════════════════════════════════════════

function Screen5({ onNext, onBack, questions, setQuestions }: {
  onNext: () => void; onBack: () => void;
  questions: QuestionData; setQuestions: React.Dispatch<React.SetStateAction<QuestionData>>;
}) {
  return (
    <div>
      <TopBar />
      <div style={{ padding: "40px 40px 0" }}>
        <Dots current={4} total={6} />
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 500, color: W.text, marginBottom: 4 }}>Guided questions</h2>
            <p style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft }}>These make your report richer. Skip any you don&apos;t know. Subscribers get dynamic questions based on enabled sections.</p>
          </div>

          {/* Occupancy & Leasing */}
          <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>For: Occupancy & Leasing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { l: "Move-ins this month", p: "e.g. 8", k: "moveIns" as const },
              { l: "Move-outs this month", p: "e.g. 5", k: "moveOuts" as const },
            ].map((q, i) => (
              <div key={i}>
                <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text, display: "block", marginBottom: 3 }}>
                  {q.l} <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 10 }}>optional</span>
                </label>
                <input type="number" placeholder={q.p} value={questions[q.k]}
                  onChange={(e) => setQuestions((prev) => ({ ...prev, [q.k]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 12, color: W.text, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Revenue, Expense & NOI */}
          <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>For: Revenue, Expense & NOI analysis</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text, display: "block", marginBottom: 3 }}>
              Any notable financial changes? <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 10 }}>optional</span>
            </label>
            <textarea
              placeholder="e.g. Insurance renewal increased 12% due to market conditions. Utility rebate of $8,200 credited this month. Two vacant units under renovation — expected online in April."
              rows={3}
              value={questions.financialChanges}
              onChange={(e) => setQuestions((prev) => ({ ...prev, financialChanges: e.target.value }))}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 12, color: W.text, outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted, marginTop: 2 }}>The engine weaves this into Revenue, Expense, and NOI narrative automatically.</div>
          </div>

          {/* Executive Summary & Distribution */}
          <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>For: Executive Summary & Distribution</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text, display: "block", marginBottom: 3 }}>
              Distribution status <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 10 }}>optional</span>
            </label>
            <select
              value={questions.distributionStatus}
              onChange={(e) => setQuestions((prev) => ({ ...prev, distributionStatus: e.target.value }))}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 12, color: W.textSoft, outline: "none", boxSizing: "border-box" }}
            >
              <option value="">Select one</option>
              {["On Track", "Delayed", "Suspended", "Not Applicable"].map((o, j) => <option key={j}>{o}</option>)}
            </select>
            <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted, marginTop: 2 }}>Appears in the distribution status banner in your report footer.</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text, display: "block", marginBottom: 3 }}>
              Asset manager&apos;s monthly notes <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 10 }}>optional</span>
            </label>
            <textarea
              placeholder="Paste your property notes for the month here — capital projects, staffing changes, market observations, investor communications. Our engine incorporates these into the relevant sections."
              rows={3}
              value={questions.assetManagerNotes}
              onChange={(e) => setQuestions((prev) => ({ ...prev, assetManagerNotes: e.target.value }))}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 12, color: W.text, outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <Btn onClick={onNext} gradient>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Generate My Report
          </Btn>
          <Back onClick={onBack} />
          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 6: DELIVERED
// ═══════════════════════════════════════════════════════════

function Screen6({ userEmail, reportId, onChoosePlan, onBookDemo }: {
  userEmail: string; reportId: string | null;
  onChoosePlan: () => void; onBookDemo: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(userEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const handleSendAndView = async () => {
    if (!email || !reportId) return;
    setSending(true);
    try {
      const res = await fetch("/api/free-report/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reportId }),
      });
      const data = await res.json().catch(() => ({}));
      setSent(true);

      // Schedule follow-up email 1 (demo push) — 2 minutes after delivery
      setTimeout(() => {
        fetch("/api/free-report/follow-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId,
            email,
            propertyName: data.propertyName || "your property",
            emailNumber: 1,
          }),
        }).catch(() => {});
      }, 120_000);

      // Navigate to public report viewer after brief delay
      setTimeout(() => {
        router.push(`/report/${reportId}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to send email:", err);
      setSending(false);
    }
  };

  return (
    <div>
      <TopBar />
      <div style={{ padding: "44px 44px 0" }}>
        <Dots current={5} total={6} />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 100, background: W.greenBg, border: `1px solid ${W.green}20`, marginBottom: 18 }}>
            <CheckIcon color={W.green} size={16} />
            <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>Your report is ready</span>
          </div>

          <h2 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, color: W.text, lineHeight: 1.2, marginBottom: 6 }}>
            Where should we <span style={{ color: W.accent }}>deliver your report?</span>
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, maxWidth: 500, margin: "0 auto", marginBottom: 16 }}>
            We&apos;ll email it exactly as your investors would receive it — branded summary with a &ldquo;View Full Report&rdquo; button. You&apos;ll also see the math verification audit trail in the viewer.
          </p>

          <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 14, color: W.text, outline: "none", boxSizing: "border-box" }}
            />
            <button
              onClick={handleSendAndView}
              disabled={sending || sent || !reportId}
              style={{
                padding: "12px 24px", background: sent ? W.green : W.accent, color: "#fff", border: "none", borderRadius: 10, cursor: sending || sent ? "default" : "pointer",
                fontFamily: F.body, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sent ? (
                <><CheckIcon color="#fff" size={16} /> Sent</>
              ) : sending ? (
                "Sending..."
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  Send & View Report
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: W.border, margin: "0 0 20px" }} />

        {/* CTA SPLIT */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 500, color: W.text, marginBottom: 4 }}>Ready to streamline your reporting?</h3>
          <p style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, marginBottom: 14 }}>Every plan includes immediate access and a live onboarding session with you or your team.</p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16, maxWidth: 440, margin: "0 auto 16px" }}>
            <button onClick={onChoosePlan} style={{
              flex: 1, padding: "14px 20px", background: W.accent, color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
              fontFamily: F.body, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: `0 4px 16px ${W.accent}25`,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              Choose a Plan
            </button>
            <button onClick={onBookDemo} style={{
              flex: 1, padding: "14px 20px", background: W.bg, color: W.navy, border: `1px solid ${W.navy}25`, borderRadius: 12, cursor: "pointer",
              fontFamily: F.body, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Book a Demo
            </button>
          </div>
        </div>

        {/* Billing + plans */}
        <BillingToggle cycle={cycle} onChange={setCycle} compact />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxWidth: 660, margin: "0 auto" }}>
          {[
            { tier: "foundational" as const, name: "Foundational", tag: "Your free report", tagC: W.gold, tagBg: W.goldBg, items: ["4 sections", "T-12 analysis", "Math verification", "PDF + HTML export", "1 user"] },
            { tier: "professional" as const, name: "Professional", tag: "Most popular", tagC: W.accent, tagBg: `${W.accent}10`, featured: true, items: ["10 sections + charts", "Rent roll analysis", "Budget variance", "Custom branding", "Pipeline + 3 users"] },
            { tier: "institutional" as const, name: "Institutional", tag: "Enterprise", tagC: W.navy, tagBg: W.navyBg, items: ["15 sections", "Everything in Pro", "Thesis tracking", "API + 10 users", "Dedicated AM"] },
          ].map((plan, i) => (
            <PlanCard key={i} plan={plan} cycle={cycle} compact />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 6, fontFamily: F.body, fontSize: 10, color: W.textMuted }}>One license per property. Welcome email + live onboarding included.</div>

        <div style={{ height: 1, background: W.border, margin: "20px 0" }} />

        {/* Platform features */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 500, color: W.text, marginBottom: 4 }}>What subscribers use every month</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxWidth: 660, margin: "0 auto", marginBottom: 44 }}>
          {[
            { t: "Upload budget once", d: "Automatic variance analysis in every report." },
            { t: "Set strategy once", d: "Track performance against your acquisition thesis." },
            { t: "Team workspace", d: "Roles, approvals, and pipeline notifications." },
            { t: "Report pipeline", d: "Draft → Review → Approve → Send → Archive." },
            { t: "Full section control", d: "Order, length, disclaimers. Set once, run monthly." },
            { t: "Export for any platform", d: "PDF, HTML, or rich email-ready format." },
          ].map((f, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: W.bgAlt, border: `1px solid ${W.borderL}` }}>
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 2 }}>{f.t}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: W.textSoft, lineHeight: 1.4 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Generating Screen — Rich content carousel while report builds
// ═══════════════════════════════════════════════════════════

const GENERATING_SLIDES = [
  {
    type: "verification" as const,
    title: "Three-layer math verification",
    items: [
      { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Layer 1", desc: "Every input traced to your source documents" },
      { icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", label: "Layer 2", desc: "15+ registered formulas verified (NOI, EGI, DSCR)" },
      { icon: "M12 20V10M18 20V4M6 20v-4", label: "Layer 3", desc: "Every formula re-computed by deterministic math engine" },
    ],
  },
  {
    type: "reviews" as const,
    title: "What asset managers are saying",
    reviews: [
      { name: "Managing Partner", firm: "12-property multifamily fund", quote: "We cut our reporting time from 6 hours per property to under 10 minutes. LPs noticed the quality improvement immediately." },
      { name: "VP of Asset Management", firm: "8-property value-add portfolio", quote: "The math verification alone justified the switch. We caught a $40K variance that our manual process missed for two months." },
      { name: "Director of Operations", firm: "22-property portfolio", quote: "Our investors started commenting on how professional and consistent our reports look. That never happened before WriteUp AI." },
    ],
  },
  {
    type: "plans" as const,
    title: "Plans designed for every portfolio size",
    plans: [
      { name: "Foundational", price: PRICING.foundational.monthly, sections: "4 sections", desc: "T-12 analysis with math verification" },
      { name: "Professional", price: PRICING.professional.monthly, sections: "10 sections + charts", desc: "Rent roll, budget variance, custom branding", popular: true },
      { name: "Institutional", price: PRICING.institutional.monthly, sections: "15 sections — full depth", desc: "Thesis tracking, API, dedicated AM" },
    ],
  },
  {
    type: "features" as const,
    title: "What you get as a subscriber",
    features: [
      { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", title: "Export anywhere", desc: "PDF, HTML, or email-ready format" },
      { icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", title: "Edit & regenerate", desc: "Modify any section with AI-powered rewrites" },
      { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0", title: "Team collaboration", desc: "Roles, approvals, and pipeline workflow" },
      { icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343", title: "Full brand control", desc: "Logo, colors, disclaimers, section order" },
    ],
  },
];

function GeneratingScreen({ reportReady, onContinue }: { reportReady: boolean; onContinue: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Uploading files...");
  const [slideIndex, setSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Progress phases
  useEffect(() => {
    if (reportReady) {
      setProgress(100);
      setPhase("Report complete");
      return;
    }
    const phases = [
      { pct: 8, label: "Uploading files..." },
      { pct: 18, label: "Creating property profile..." },
      { pct: 30, label: "Extracting financial data..." },
      { pct: 42, label: "Parsing T-12 line items..." },
      { pct: 55, label: "Building source data registry..." },
      { pct: 65, label: "Generating Executive Summary..." },
      { pct: 72, label: "Analyzing occupancy & leasing..." },
      { pct: 78, label: "Running revenue analysis..." },
      { pct: 84, label: "Processing expense categories..." },
      { pct: 90, label: "Computing NOI performance..." },
      { pct: 95, label: "Running three-layer math verification..." },
      { pct: 97, label: "Finalizing report..." },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < phases.length) { setProgress(phases[i].pct); setPhase(phases[i].label); i++; }
    }, 3500);
    return () => clearInterval(interval);
  }, [reportReady]);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % GENERATING_SLIDES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const slide = GENERATING_SLIDES[slideIndex];

  return (
    <div>
      <TopBar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 32px" }}>

        {/* Report Ready Banner */}
        {reportReady && (
          <div style={{ marginBottom: 20, padding: isMobile ? "16px" : "18px 24px", borderRadius: 14, background: W.greenBg, border: `1px solid ${W.green}25`, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 12 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${W.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckIcon color={W.green} size={20} />
              </div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 700, color: W.green }}>Your report is ready</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid }}>5 sections generated with math verification complete</div>
              </div>
            </div>
            <button onClick={onContinue} style={{
              padding: isMobile ? "14px 24px" : "12px 28px", borderRadius: 10, border: "none", cursor: "pointer",
              background: W.green, color: "#fff", fontFamily: F.body, fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              boxShadow: `0 4px 16px ${W.green}30`, width: isMobile ? "100%" : "auto", justifyContent: "center",
            }}>
              Continue to Your Report
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        {/* Progress section */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 12 }}>
            {!reportReady && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
            )}
            <h2 style={{ fontFamily: F.display, fontSize: isMobile ? 20 : 24, fontWeight: 500, color: W.text, margin: 0 }}>
              {reportReady ? "While you\u2019re here \u2014 explore what\u2019s next" : "Generating your report"}
            </h2>
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", height: 5, borderRadius: 100, background: W.borderL, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", borderRadius: 100, background: reportReady ? W.green : `linear-gradient(90deg, ${W.accent}, ${W.accentDark})`, width: `${progress}%`, transition: "width 0.8s ease" }} />
          </div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: reportReady ? W.green : W.textMid, fontWeight: 500 }}>{phase}</div>
        </div>

        {/* Carousel dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {GENERATING_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlideIndex(i)} style={{
              width: slideIndex === i ? 20 : 8, height: 8, borderRadius: 100, border: "none", cursor: "pointer",
              background: slideIndex === i ? W.accent : W.borderL, transition: "all 0.3s", padding: 0,
            }} />
          ))}
        </div>

        {/* Slide content */}
        <div style={{ padding: isMobile ? "20px 16px" : "24px 28px", borderRadius: 16, background: W.bgAlt, border: `1px solid ${W.border}`, minHeight: isMobile ? 280 : 300 }}>
          <div style={{ fontFamily: F.display, fontSize: isMobile ? 18 : 20, fontWeight: 500, color: W.text, textAlign: "center", marginBottom: 16 }}>{slide.title}</div>

          {/* Verification slide */}
          {slide.type === "verification" && slide.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < slide.items.length - 1 ? `1px solid ${W.borderL}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: W.greenBg, border: `1px solid ${W.green}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic d={item.icon} c={W.green} s={15} />
              </div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>{item.label}</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft }}>{item.desc}</div>
              </div>
            </div>
          ))}

          {/* Reviews slide */}
          {slide.type === "reviews" && slide.reviews.map((rev, i) => (
            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: W.bg, border: `1px solid ${W.borderL}`, marginBottom: i < slide.reviews.length - 1 ? 10 : 0 }}>
              <div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid, lineHeight: 1.6, fontStyle: "italic", marginBottom: 8 }}>&ldquo;{rev.quote}&rdquo;</div>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text }}>{rev.name}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted }}>{rev.firm}</div>
            </div>
          ))}

          {/* Plans slide */}
          {slide.type === "plans" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
              {slide.plans.map((plan, i) => (
                <div key={i} style={{ padding: "14px 16px", borderRadius: 10, background: W.bg, border: plan.popular ? `2px solid ${W.accent}` : `1px solid ${W.borderL}`, textAlign: "center" }}>
                  {plan.popular && <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: W.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Most Popular</div>}
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.textMid }}>{plan.name}</div>
                  <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, color: W.text }}>${plan.price}<span style={{ fontSize: 11, fontWeight: 400, color: W.textSoft }}>/mo</span></div>
                  <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, marginBottom: 2 }}>{plan.sections}</div>
                  <div style={{ fontFamily: F.body, fontSize: 10, color: W.textSoft }}>{plan.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Features slide */}
          {slide.type === "features" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {slide.features.map((feat, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: W.bg, border: `1px solid ${W.borderL}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic d={feat.icon} c={W.accent} s={14} />
                  </div>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text }}>{feat.title}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: W.textSoft }}>{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-property note */}
        <div style={{ textAlign: "center", marginTop: 12, fontFamily: F.body, fontSize: 10, color: W.textMuted }}>
          Per-property pricing. Every plan includes live onboarding. Upgrade or cancel anytime.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FormData {
  propertyName: string;
  unitCount: string;
  address: string;
  companyName: string;
  preset: number;
  t12File: File | null;
  rentRollFile: File | null;
}

interface QuestionData {
  moveIns: string;
  moveOuts: string;
  financialChanges: string;
  distributionStatus: string;
  assetManagerNotes: string;
}

// ═══════════════════════════════════════════════════════════
// DEMO BOOKING MODAL — Qualify → Calendar → Confirm
// ═══════════════════════════════════════════════════════════

const CALENDLY_URL = "https://calendly.com/yourpropertyoffers/writeup-ai-platform-walkthrough";

function LeadCaptureForm({ userEmail, propertyCount, reportFrequency, onClose }: { userEmail: string; propertyCount: number; reportFrequency: string; onClose: () => void }) {
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email && !phone) return;
    setSubmitting(true);
    try {
      // Store lead data — you can wire this to Supabase, Resend, or a webhook later
      console.log("[LEAD CAPTURE]", { email, phone, propertyCount, reportFrequency, budgetFit: "no", timestamp: new Date().toISOString() });
      // TODO: POST to /api/leads or store in Supabase leads table
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <CheckIcon color={W.green} size={16} />
          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>We&apos;ll be in touch</span>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, marginBottom: 12 }}>Your complimentary report is still ready to explore.</div>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: W.accent, color: "#fff", fontFamily: F.body, fontSize: 13, fontWeight: 600 }}>Back to My Report</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 3 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 13, color: W.text, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 3 }}>Phone <span style={{ fontWeight: 400, color: W.textMuted }}>optional</span></label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(713) 555-0100" type="tel" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 13, color: W.text, outline: "none", boxSizing: "border-box" }} />
      </div>
      <button onClick={handleSubmit} disabled={(!email && !phone) || submitting} style={{
        width: "100%", padding: "11px 20px", borderRadius: 8, border: "none", cursor: email || phone ? "pointer" : "not-allowed",
        background: email || phone ? W.accent : W.textMuted, color: "#fff",
        fontFamily: F.body, fontSize: 13, fontWeight: 600, opacity: email || phone ? 1 : 0.5,
      }}>{submitting ? "Sending..." : "Keep Me Posted"}</button>
    </div>
  );
}

function DemoBookingModal({ onClose, userEmail, userName }: { onClose: () => void; userEmail: string; userName: string }) {
  const [demoStep, setDemoStep] = useState(0); // 0 = qualify, 1 = calendar, 2 = confirmed
  const [propertyCount, setPropertyCount] = useState("");
  const [reportFrequency, setReportFrequency] = useState("");
  const [budgetFit, setBudgetFit] = useState<"yes" | "no" | "">("");
  const [countdown, setCountdown] = useState(175); // 2:55 in seconds

  // Dynamic pricing: property count × Foundational monthly price
  const parsedCount = parseInt(propertyCount, 10);
  const isValidCount = !isNaN(parsedCount) && parsedCount > 0;
  const portfolioPrice = isValidCount ? parsedCount * PRICING.foundational.monthly : 0;

  // Countdown timer — starts when calendar step shows
  useEffect(() => {
    if (demoStep !== 1) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [demoStep]);

  // Listen for Calendly booking confirmation via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.event === "calendly.event_scheduled") {
        setDemoStep(2);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // All three questions answered and budget confirmed
  const canProceedToCalendar = isValidCount && reportFrequency && budgetFit === "yes";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (n: number) => n.toLocaleString("en-US");

  // Calendly embed URL with prefilled data
  const calendlyEmbedUrl = `${CALENDLY_URL}?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=00B7DB${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""}${userName ? `&name=${encodeURIComponent(userName)}` : ""}`;

  // Responsive: detect narrow viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: isMobile ? 8 : 16, backdropFilter: "blur(6px)", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: W.bg, borderRadius: isMobile ? 16 : 20, width: "100%",
        maxWidth: demoStep === 1 ? (isMobile ? "100%" : 720) : (isMobile ? "100%" : 520),
        maxHeight: isMobile ? "96vh" : "92vh", overflow: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)", transition: "max-width 0.3s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${W.borderL}`, position: "sticky", top: 0, background: W.bg, zIndex: 1, borderRadius: isMobile ? "16px 16px 0 0" : "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            {[0, 1, 2].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: isMobile ? 3 : 4 }}>
                <div style={{
                  width: isMobile ? 22 : 24, height: isMobile ? 22 : 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: F.body, fontSize: isMobile ? 10 : 11, fontWeight: 700,
                  background: demoStep >= s ? (demoStep > s ? W.greenBg : `${W.accent}12`) : W.bgAlt,
                  color: demoStep >= s ? (demoStep > s ? W.green : W.accent) : W.textMuted,
                  border: `1px solid ${demoStep >= s ? (demoStep > s ? `${W.green}30` : `${W.accent}25`) : W.border}`,
                }}>
                  {demoStep > s ? <CheckIcon color={W.green} size={10} /> : s + 1}
                </div>
                {s < 2 && <div style={{ width: isMobile ? 12 : 20, height: 1, background: demoStep > s ? W.green : W.borderL }} />}
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: W.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* ── STEP 1: Qualifying Questions ── */}
        {demoStep === 0 && (
          <div style={{ padding: isMobile ? "20px 16px" : "28px 32px" }}>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 18 : 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Step 1 of 3</div>
              <h3 style={{ fontFamily: F.display, fontSize: isMobile ? 20 : 24, fontWeight: 500, color: W.text, marginBottom: 6 }}>Tell us about your portfolio</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.5 }}>This helps us prepare a walkthrough tailored to your firm. Takes 30 seconds.</p>
            </div>

            {/* Q1: Property count */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text, display: "block", marginBottom: 6 }}>How many multifamily properties do you manage? <span style={{ color: W.red }}>*</span></label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 8"
                value={propertyCount}
                onChange={(e) => { setPropertyCount(e.target.value); setBudgetFit(""); }}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${W.border}`, background: W.bg,
                  fontFamily: F.body, fontSize: 15, color: W.text,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Q2: Reporting frequency */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text, display: "block", marginBottom: 6 }}>How often do you report to your investors? <span style={{ color: W.red }}>*</span></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Monthly", "Quarterly", "Annually", "Not yet"].map((opt) => (
                  <button key={opt} onClick={() => setReportFrequency(opt)} style={{
                    padding: isMobile ? "10px 14px" : "10px 20px", borderRadius: 8, cursor: "pointer",
                    fontFamily: F.body, fontSize: 13, fontWeight: 500, flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto",
                    background: reportFrequency === opt ? `${W.accent}10` : W.bg,
                    color: reportFrequency === opt ? W.accent : W.textMid,
                    border: reportFrequency === opt ? `2px solid ${W.accent}` : `1px solid ${W.border}`,
                    textAlign: "center",
                  }}>{opt}</button>
                ))}
              </div>
            </div>

            {/* Q3: Dynamic pricing gate — only shows after Q1 is answered */}
            {isValidCount && reportFrequency && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ padding: isMobile ? "16px 14px" : "20px 24px", borderRadius: 12, background: W.bgAlt, border: `1px solid ${W.border}`, marginBottom: 12 }}>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, marginBottom: 6 }}>
                    Based on {parsedCount} {parsedCount === 1 ? "property" : "properties"}, {reportFrequency.toLowerCase()} reporting:
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: W.text, marginBottom: 4 }}>
                    Plans start at ${formatCurrency(portfolioPrice)}<span style={{ fontSize: 14, fontWeight: 400, color: W.textSoft }}>/mo for your firm</span>
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>
                    We&apos;ll explore the right tier for you on the call.
                  </div>
                </div>

                <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 8 }}>Does ${formatCurrency(portfolioPrice)}/mo work for your firm? <span style={{ color: W.red }}>*</span></label>
                <div style={{ display: "flex", gap: 10 }}>
                  {([
                    { value: "yes" as const, label: `Yes, $${formatCurrency(portfolioPrice)}/mo works`, color: W.green, bg: W.greenBg, borderC: `${W.green}30` },
                    { value: "no" as const, label: `No, $${formatCurrency(portfolioPrice)}/mo doesn\u2019t work`, color: W.textSoft, bg: W.bgAlt, borderC: W.border },
                  ]).map((opt) => (
                    <button key={opt.value} onClick={() => setBudgetFit(opt.value)} style={{
                      flex: 1, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                      fontFamily: F.body, fontSize: 13, fontWeight: 600, textAlign: "center",
                      background: budgetFit === opt.value ? opt.bg : W.bg,
                      color: budgetFit === opt.value ? opt.color : W.textMid,
                      border: budgetFit === opt.value ? `2px solid ${opt.borderC}` : `1px solid ${W.border}`,
                    }}>{opt.label}</button>
                  ))}
                </div>

                {/* Soft off-ramp if they say no */}
                {budgetFit === "no" && (
                  <div style={{ marginTop: 12, padding: isMobile ? "16px 14px" : "20px 20px", borderRadius: 12, background: W.bgAlt, border: `1px solid ${W.border}` }}>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 6 }}>We understand — let us follow up when it makes sense.</div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.5, marginBottom: 14 }}>
                      Leave your info and we&apos;ll reach out with options that fit your budget. No pressure, no spam.
                    </div>
                    <LeadCaptureForm userEmail={userEmail} propertyCount={parsedCount} reportFrequency={reportFrequency} onClose={onClose} />
                  </div>
                )}
              </div>
            )}

            {/* CTA — only enabled when all 3 answered + budget = yes */}
            {budgetFit !== "no" && (
              <button onClick={() => setDemoStep(1)} disabled={!canProceedToCalendar} style={{
                width: "100%", padding: isMobile ? "14px 20px" : "14px 24px", borderRadius: 12, border: "none",
                cursor: canProceedToCalendar ? "pointer" : "not-allowed",
                background: canProceedToCalendar ? W.accent : W.textMuted, color: "#fff",
                fontFamily: F.body, fontSize: 15, fontWeight: 600,
                boxShadow: canProceedToCalendar ? `0 4px 16px ${W.accent}30` : "none",
                opacity: canProceedToCalendar ? 1 : 0.5,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                See Available Times
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        )}

        {/* ── STEP 2: Calendly Calendar ── */}
        {demoStep === 1 && (
          <div style={{ padding: isMobile ? "14px 12px" : "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Step 2 of 3</div>
              <h3 style={{ fontFamily: F.display, fontSize: isMobile ? 18 : 22, fontWeight: 500, color: W.text, marginBottom: 4 }}>Pick a time for your walkthrough</h3>
              <p style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft }}>25-minute live demo. Bring a T-12 — we&apos;ll generate your report on the call.</p>
            </div>

            {/* Urgency bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "8px 12px" : "10px 16px", borderRadius: 10, background: W.goldBg, border: `1px solid ${W.gold}20`, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: W.gold }}>Limited spots this week</span>
              </div>
              {countdown > 0 && (
                <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.gold, fontVariantNumeric: "tabular-nums" }}>{formatTime(countdown)}</span>
              )}
            </div>

            {/* Calendly iframe */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${W.borderL}`, minHeight: isMobile ? 480 : 500 }}>
              <iframe
                src={calendlyEmbedUrl}
                style={{ width: "100%", minHeight: isMobile ? 520 : 580, border: "none" }}
                title="Book a demo"
              />
            </div>

            <div style={{ textAlign: "center", marginTop: 10, paddingBottom: 4 }}>
              <button onClick={() => setDemoStep(0)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 12, color: W.textMuted }}>← Back to questions</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {demoStep === 2 && (
          <div style={{ padding: isMobile ? "28px 16px" : "40px 32px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: W.greenBg, border: `1px solid ${W.green}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckIcon color={W.green} size={28} />
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: W.greenBg, border: `1px solid ${W.green}20`, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Step 3 of 3</div>

            <h3 style={{ fontFamily: F.display, fontSize: isMobile ? 22 : 26, fontWeight: 500, color: W.text, marginBottom: 8 }}>Your call is confirmed</h3>

            <p style={{ fontFamily: F.body, fontSize: 14, color: W.textMid, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 24px" }}>
              Check your email for the calendar invite with your Zoom link. Come prepared with a recent T-12 — we&apos;ll generate your report live on the call.
            </p>

            {/* What to prepare */}
            <div style={{ background: W.bgAlt, borderRadius: 12, padding: isMobile ? "14px 16px" : "18px 24px", textAlign: "left", maxWidth: 400, margin: "0 auto 24px", border: `1px solid ${W.border}` }}>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Come prepared</div>
              {[
                "Your most recent T-12 (PDF, Excel, or CSV)",
                "A property you want to see in report format",
                "Any questions about your current reporting workflow",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0" }}>
                  <CheckIcon color={W.accent} size={14} />
                  <span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Video placeholder */}
            <div style={{ background: W.bgAlt, borderRadius: 12, padding: isMobile ? "24px 16px" : "32px 24px", maxWidth: 400, margin: "0 auto 24px", border: `1px solid ${W.border}`, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${W.accent}12`, border: `1px solid ${W.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={W.accent} stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 4 }}>Watch before your call</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: W.textSoft }}>2-minute overview of what we&apos;ll cover and how to get the most from your walkthrough.</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted, marginTop: 8, fontStyle: "italic" }}>Video coming soon</div>
            </div>

            <button onClick={onClose} style={{
              padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer",
              background: W.accent, color: "#fff", fontFamily: F.body, fontSize: 14, fontWeight: 600,
            }}>Back to Your Report</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface WelcomeClientProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export default function WelcomeClient({ userId, userEmail, userName }: WelcomeClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Form data persists across screens
  const [formData, setFormData] = useState<FormData>({
    propertyName: "",
    unitCount: "",
    address: "",
    companyName: "",
    preset: 0,
    t12File: null,
    rentRollFile: null,
  });

  const [questions, setQuestions] = useState<QuestionData>({
    moveIns: "",
    moveOuts: "",
    financialChanges: "",
    distributionStatus: "",
    assetManagerNotes: "",
  });

  const goTo = (n: number) => {
    setStep(Math.max(0, Math.min(5, n)));
    window.scrollTo(0, 0);
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      // Step 1: Create property, upload files, create report record
      const fd = new globalThis.FormData();
      fd.append("propertyName", formData.propertyName);
      fd.append("unitCount", formData.unitCount);
      fd.append("address", formData.address);
      fd.append("companyName", formData.companyName);
      fd.append("preset", String(formData.preset));
      fd.append("presetColors", JSON.stringify(PRESETS[formData.preset]));

      fd.append("questionnaire", JSON.stringify({
        move_ins: questions.moveIns || null,
        move_outs: questions.moveOuts || null,
        financial_changes: questions.financialChanges || null,
        distribution_status: questions.distributionStatus || null,
        asset_manager_notes: questions.assetManagerNotes || null,
      }));

      if (formData.t12File) fd.append("t12", formData.t12File);
      if (formData.rentRollFile) fd.append("rentRoll", formData.rentRollFile);

      const setupRes = await fetch("/api/free-report/generate", {
        method: "POST",
        body: fd,
      });

      if (!setupRes.ok) {
        const data = await setupRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to set up report");
      }

      const setupData = await setupRes.json();
      setReportId(setupData.reportId);

      // Step 2: Trigger generation using the existing generate endpoint
      // Same endpoint the normal generate page calls — no changes needed there
      const genRes = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: setupData.reportId,
          propertyId: setupData.propertyId,
          selectedMonth: setupData.selectedMonth,
          selectedYear: setupData.selectedYear,
          tier: setupData.tier,
          distributionStatus: setupData.questionnaire?.distribution_status || "",
          distributionNote: "",
          questionnaireAnswers: setupData.questionnaire || {},
          streaming: false,
        }),
      });

      if (!genRes.ok) {
        // Generation failed but property and files are created
        // User can still see the report (will be empty/draft) and retry
        console.error("[FREE-REPORT] Generation trigger failed:", genRes.status);
      }

      // Don't auto-advance — show "report ready" button on generating screen
      setReportReady(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setGenerating(false);
    }
  }, [formData, questions]);

  const handleChoosePlan = () => {
    router.push("/dashboard/pricing");
  };

  const handleBookDemo = () => {
    setShowDemoModal(true);
  };

  // Show generating screen
  if (generating) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body }}>
        <GeneratingScreen
          reportReady={reportReady}
          onContinue={() => { setGenerating(false); setReportReady(false); goTo(5); }}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body }}>
        <TopBar />
        <div style={{ padding: "80px 44px", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${W.red}08`, border: `1px solid ${W.red}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={W.red} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 500, color: W.text, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, marginBottom: 24 }}>{error}</p>
          <div style={{ maxWidth: 300, margin: "0 auto" }}>
            <Btn onClick={() => { setError(null); goTo(4); }}>Try Again</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body }}>
      {step === 0 && <Screen1 onNext={() => goTo(1)} />}
      {step === 1 && <Screen2 onNext={() => goTo(2)} onBack={() => goTo(0)} />}
      {step === 2 && <Screen3 onNext={() => goTo(3)} onBack={() => goTo(1)} />}
      {step === 3 && <Screen4 onNext={() => goTo(4)} onBack={() => goTo(2)} formData={formData} setFormData={setFormData} />}
      {step === 4 && <Screen5 onNext={handleGenerate} onBack={() => goTo(3)} questions={questions} setQuestions={setQuestions} />}
      {step === 5 && <Screen6 userEmail={userEmail} reportId={reportId} onChoosePlan={handleChoosePlan} onBookDemo={handleBookDemo} />}
      {showDemoModal && <DemoBookingModal onClose={() => setShowDemoModal(false)} userEmail={userEmail} userName={userName} />}
    </div>
  );
}
