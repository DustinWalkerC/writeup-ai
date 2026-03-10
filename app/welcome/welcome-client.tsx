// app/welcome/welcome-client.tsx
// WriteUp AI — Onboarding Funnel v9 (Production)
// Route: /welcome — standalone, no sidebar
// Flow: Hook → Sections → Upload+Brand → Questions → Generating → Delivered
// ALL inline styles. No Tailwind. No emojis. SVG icons only.

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════
// Design System
// ═══════════════════════════════════════════════════════════

const W = {
  accent: "#00B7DB", accentDark: "#0099B8",
  bg: "#FFFFFF", bgAlt: "#F7F5F1", bgWarm: "#FAF9F7",
  text: "#1A1A1A", textMid: "#4A4A4A", textSoft: "#7A7A7A", textMuted: "#A3A3A3",
  border: "#E8E5E0", borderL: "#F0EDE8",
  green: "#29581D", greenBg: "#F0F7ED",
  navy: "#002D5F", navyBg: "#F0F4F9",
  gold: "#B8960F", goldBg: "#FBF8EF",
  red: "#CC0000",
};
const F = { display: "'Newsreader','Georgia',serif", body: "'DM Sans','Helvetica Neue',sans-serif" };

// ═══════════════════════════════════════════════════════════
// Responsive Hook
// ═══════════════════════════════════════════════════════════

function useResponsive() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return { m: w < 640, t: w >= 640 && w < 1024 };
}

// ═══════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════

const PRESETS = [
  { name: "Bold Burgundy", primary: "#7b2d3b", secondary: "#fefcf9", accent: "#d4a04a" },
  { name: "Corporate Navy", primary: "#1B2A4A", secondary: "#F0F4F9", accent: "#C8A951" },
  { name: "Modern Teal", primary: "#0D4F4F", secondary: "#F0FAF9", accent: "#00B7DB" },
  { name: "Classic Charcoal", primary: "#27272A", secondary: "#FAFAFA", accent: "#2563EB" },
  { name: "Deep Forest", primary: "#1A3A2A", secondary: "#F5F7F2", accent: "#4A8C5C" },
  { name: "Iron & Gold", primary: "#2C2C2C", secondary: "#FAF9F7", accent: "#C49A2A" },
];

const ALL_SECTIONS = [
  { id: "executive_summary", title: "Executive Summary", desc: "High-level overview with KPI cards showing NOI, revenue, occupancy, and expenses with month-over-month trends and budget variance.", tier: "foundational", viz: "KPI Cards", vizD: "4-5 key metric cards with trend indicators" },
  { id: "occupancy_leasing", title: "Occupancy & Leasing", desc: "Physical and economic occupancy analysis, move-in/move-out velocity, lease renewal rates, and concession trends.", tier: "professional", viz: "Chart", vizD: "Occupancy gauge with physical vs. economic comparison" },
  { id: "revenue_analysis", title: "Revenue Analysis", desc: "GPR-to-EGI waterfall — every deduction itemized: vacancy loss, concessions, bad debt, and other income.", tier: "professional", viz: "Chart", vizD: "Revenue waterfall chart showing GPR to total revenue bridge" },
  { id: "expense_analysis", title: "Expense Analysis", desc: "Category-by-category expense breakdown ranked by dollar impact, with budget variance and MoM change.", tier: "professional", viz: "Chart", vizD: "Horizontal bar chart ranking expense categories" },
  { id: "noi_performance", title: "Net Operating Income", desc: "NOI with actual vs. budget vs. prior month, margin analysis, per-unit metrics, and trailing 12-month trend.", tier: "professional", viz: "Chart", vizD: "NOI trend chart with budget comparison" },
  { id: "rent_roll_insights", title: "Rent Roll Insights", desc: "Unit mix, average rent by floorplan, market vs. effective rent, lease expiration concentration.", tier: "professional", viz: "Chart" },
  { id: "market_positioning", title: "Market Positioning", desc: "Submarket context, competitive positioning, and rent growth trends.", tier: "professional", viz: "—" },
  { id: "capital_improvements", title: "Capital & Improvements", desc: "Active/completed projects with cost tracking and ROI.", tier: "professional", viz: "Conditional" },
  { id: "risk_watch_items", title: "Risk & Watch Items", desc: "Data-driven risk flags with severity ratings.", tier: "professional", viz: "Table" },
  { id: "asset_manager_outlook", title: "Asset Manager Outlook", desc: "30-60-90 day strategic narrative from questionnaire responses.", tier: "foundational", viz: "—" },
  { id: "investment_thesis_update", title: "Investment Thesis Update", desc: "Performance tracking against your original acquisition thesis.", tier: "institutional", viz: "Premium" },
  { id: "lease_expiration_rollover", title: "Lease Expiration & Rollover", desc: "12-month expiration calendar, revenue-at-risk analysis.", tier: "institutional", viz: "Premium" },
  { id: "rent_roll_deep_dive", title: "Rent Roll Deep Dive", desc: "Distribution histogram, loss-to-lease, unit-level profitability.", tier: "institutional", viz: "Premium" },
  { id: "budget_vs_actual", title: "Budget vs. Actual", desc: "Line-by-line variance with dollar/percentage delta.", tier: "institutional", viz: "Conditional" },
  { id: "market_submarket_analysis", title: "Market & Submarket Analysis", desc: "Comparable properties, rent comps, supply pipeline.", tier: "institutional", viz: "Chart" },
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
  return cycle === "monthly" ? p : cycle === "quarterly" ? Math.round(p / 3) : Math.round(p / 12);
}

const REVIEWS = [
  { descriptor: "Regional multifamily operator", details: "1,500+ units across 14 properties in Texas", timeAgo: "6 weeks ago", content: "We cut our reporting time from 6 hours per property to under 10 minutes. The math verification caught a $38K NOI discrepancy in our first month — something our manual process missed entirely. Our LPs noticed the quality improvement immediately. Three have specifically commented on the consistency.", metric: "6 hrs → 10 min per property" },
  { descriptor: "Value-add fund manager", details: "8-property portfolio across the Sunbelt", timeAgo: "3 weeks ago", content: "Real talk: I was skeptical. Another AI tool promising to automate reporting? But this actually understands multifamily financials. GPR to EGI waterfalls, expense variance by category, occupancy trends — all generated from my T-12 with proper CRE terminology. The three-layer verification is what sold my partners. Every number traces back to source.", metric: "$40K variance caught in month 1" },
  { descriptor: "Institutional asset management firm", details: "22 properties, 4,800 units in the Southeast", timeAgo: "2 weeks ago", content: "Our reporting process was broken. OneDrive sync issues, Excel formulas breaking, charts rendering differently on every machine. Switched two months ago. Every report comes out with the same professional structure, same branded look, same verification. 22 properties reporting on time for the first time in our firm's history.", metric: "22 properties on time — a first" },
  { descriptor: "Emerging GP in first fund cycle", details: "5 properties, 640 units in the Midwest", timeAgo: "1 week ago", content: "As a first-time GP, our reporting needed to compete with firms that have dedicated IR teams. We don't have that headcount. These reports look like they came from CBRE or JLL. Our LP advisory board asked who we hired. We didn't hire anyone — we just stopped doing it manually.", metric: "LP advisory: 'Who did you hire?'" },
  { descriptor: "Portfolio operations director", details: "Top-20 multifamily operator, 3,200 units", timeAgo: "4 days ago", content: "The ROI math was simple: $299/property/month vs. the 15+ hours our analysts were spending per property. That's $375-$1,200 in labor per report. We freed up our best people to actually manage assets instead of formatting Word documents at 11 PM. The reports are better than what we produced manually.", metric: "15 analyst-hours saved per property" },
];

// ═══════════════════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════════════════

function Ic({ d, c = W.accent, s = 16 }: { d: string; c?: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
function Chk({ c = W.green, s = 14 }: { c?: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function Arr({ c = "#fff" }: { c?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function LockIc({ s = 12 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
}
function GripIc() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="5" r="1.5" fill={W.textMuted}/><circle cx="15" cy="5" r="1.5" fill={W.textMuted}/><circle cx="9" cy="11" r="1.5" fill={W.textMuted}/><circle cx="15" cy="11" r="1.5" fill={W.textMuted}/><circle cx="9" cy="17" r="1.5" fill={W.textMuted}/><circle cx="15" cy="17" r="1.5" fill={W.textMuted}/></svg>;
}

// ═══════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════

function TopBar({ m }: { m?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: m ? "10px 16px" : "12px 24px", background: W.bg, borderBottom: `1px solid ${W.borderL}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 700, fontSize: 13, color: "#fff" }}>W</div>
        <span style={{ fontFamily: F.display, fontSize: m ? 16 : 18, fontWeight: 500, color: W.text }}>WriteUp AI</span>
      </div>
      <div style={{ fontFamily: F.body, fontSize: m ? 10 : 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: W.goldBg, border: `1px solid ${W.gold}20`, color: W.gold }}>Complimentary Report</div>
    </div>
  );
}

function Dots({ current, total, m }: { current: number; total: number; m?: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: m ? "10px 0" : "14px 0" }}>{Array.from({ length: total }).map((_, i) => <div key={i} style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 100, background: i === current ? W.accent : i < current ? W.green : W.borderL, transition: "all 0.3s" }} />)}</div>;
}

function Btn({ children, onClick, disabled, m, gradient, full = true }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; m?: boolean; gradient?: boolean; full?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: full ? "100%" : "auto", padding: m ? "16px 20px" : "16px 36px", minHeight: 48, background: disabled ? W.textMuted : gradient ? `linear-gradient(135deg,${W.accent},${W.accentDark})` : W.accent, color: "#fff", border: "none", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: F.body, fontSize: m ? 15 : 16, fontWeight: 600, boxShadow: disabled ? "none" : `0 4px 20px ${W.accent}30`, opacity: disabled ? 0.6 : 1, transition: "all 0.2s" }}>{children}</button>;
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return <div style={{ textAlign: "center", marginTop: 10 }}><button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 13, color: W.textMuted, padding: "10px 16px", minHeight: 44 }}>← Back</button></div>;
}

// ── Modal ──
function Modal({ title, children, onClose, m }: { title: string; children: React.ReactNode; onClose: () => void; m?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: m ? "flex-end" : "center", justifyContent: "center", zIndex: 200, padding: m ? 0 : 16, backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: m ? "18px 18px 0 0" : 18, maxWidth: m ? "100%" : 580, width: "100%", maxHeight: m ? "90vh" : "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: m ? "14px 16px" : "16px 20px", borderBottom: `1px solid ${W.borderL}`, position: "sticky", top: 0, background: W.bg, zIndex: 1, borderRadius: m ? "18px 18px 0 0" : "18px 18px 0 0" }}>
          <span style={{ fontFamily: F.display, fontSize: m ? 16 : 18, fontWeight: 500, color: W.text }}>{title}</span>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: W.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: m ? "16px" : "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Modal icon row ──
function ModalRow({ icon, title, desc, iconColor, iconBg }: { icon: string; title: string; desc: string; iconColor?: string; iconBg?: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || `${W.accent}08`, border: `1px solid ${iconColor || W.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic d={icon} c={iconColor || W.accent} s={16} />
      </div>
      <div>
        <div style={{ fontFamily: F.body, fontWeight: 600, color: W.text, fontSize: 13, marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: F.body, color: W.textSoft, fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Review Carousel ──
function ReviewCarousel({ m }: { m?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setIdx(p => (p + 1) % REVIEWS.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  const r = REVIEWS[idx];

  return (
    <div>
      <div onClick={() => setPaused(!paused)} style={{ cursor: "pointer", background: W.bg, borderRadius: 14, border: `1px solid ${W.border}`, padding: m ? "18px 16px" : "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", position: "relative", minHeight: m ? 200 : 180 }}>
        {paused && <div style={{ position: "absolute", top: 10, right: 12, fontFamily: F.body, fontSize: 10, color: W.textMuted, background: W.bgAlt, padding: "2px 8px", borderRadius: 4 }}>Paused — tap to resume</div>}
        <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
        </div>
        <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textMid, lineHeight: 1.65, margin: "0 0 14px", fontStyle: "italic" }}>&ldquo;{r.content}&rdquo;</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: W.greenBg, border: `1px solid ${W.green}20`, marginBottom: 12 }}>
          <Chk c={W.green} s={12} />
          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.green }}>{r.metric}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.bgAlt, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>{r.descriptor}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>{r.details} · {r.timeAgo}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {REVIEWS.map((_, i) => <button key={i} onClick={() => { setIdx(i); setPaused(true); }} style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 100, border: "none", cursor: "pointer", background: idx === i ? W.accent : W.borderL, transition: "all 0.3s", padding: 0 }} />)}
      </div>
      <div style={{ textAlign: "center", marginTop: 8, fontFamily: F.body, fontSize: 10, color: W.textMuted, fontStyle: "italic" }}>
        Due to confidentiality, firm names are withheld. These outcomes are real and typical for firms adopting WriteUp AI.
      </div>
    </div>
  );
}

// ── Live Report Preview ──
function ReportPreview({ preset, propertyName, companyName, customColor }: { preset: number; propertyName: string; companyName: string; customColor?: string }) {
  const pr = PRESETS[preset] || PRESETS[0];
  const p = customColor ? { primary: customColor, secondary: "#FAFAFA", accent: W.accent } : pr;
  const secs = ALL_SECTIONS.filter(s => FREE_IDS.includes(s.id));

  return (
    <div style={{ border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden", background: "#fff", fontSize: 10, fontFamily: F.body }}>
      <div style={{ background: p.primary, padding: "10px 14px", color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: F.display }}>{propertyName || "Riverstone at Meadow Creek"}</div>
        <div style={{ fontSize: 8, opacity: 0.8, marginTop: 2 }}>March 2026 — Monthly Asset Report</div>
      </div>
      <div style={{ height: 3, background: p.accent }} />
      <div style={{ display: "flex", gap: 1, padding: "6px 8px", background: p.secondary }}>
        {["NOI", "Revenue", "Expenses", "Occ."].map((k, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "3px 2px" }}>
            <div style={{ fontSize: 7, color: W.textMuted, textTransform: "uppercase" as const }}>{k}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.primary, fontFamily: F.display }}>—</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 8px" }}>
        {secs.map((s, i) => (
          <div key={s.id} style={{ padding: "4px 0", borderBottom: i < secs.length - 1 ? `1px solid ${W.borderL}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 2, height: 8, background: p.accent, borderRadius: 1 }} />
              <span style={{ fontWeight: 600, color: W.text, fontSize: 8 }}>{s.title}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 8px", borderTop: `1px solid ${W.borderL}`, textAlign: "center", fontSize: 7, color: W.textMuted }}>Est. 8-12 pages</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 1: THE HOOK (all modals with icons)
// ═══════════════════════════════════════════════════════════

function Screen1({ onNext, m }: { onNext: () => void; m: boolean }) {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <div style={{ overflowX: "hidden" }}>
      <div style={{ padding: m ? "24px 16px" : "44px 44px 32px", maxWidth: 720, margin: "0 auto" }}>
        <Dots current={0} total={5} m={m} />
        <div style={{ textAlign: "center", marginBottom: m ? 18 : 24 }}>
          <p style={{ fontFamily: F.body, fontSize: m ? 12 : 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: W.accent, margin: "0 0 12px" }}>Your complimentary report starts here</p>
          <h1 style={{ fontFamily: F.display, fontSize: m ? 26 : 38, fontWeight: 500, color: W.text, lineHeight: 1.15, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Reporting quality is the #1 factor<br /><span style={{ color: W.accent }}>investors use to evaluate your firm</span>
          </h1>
          <p style={{ fontFamily: F.body, fontSize: m ? 14 : 15, color: W.textSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            74% of institutional LPs rank it above past performance.{" "}
            <button onClick={() => setModal("research")} style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", textDecoration: "underline", padding: 0 }}>See the research</button>.
            {" "}We built WriteUp AI to give your firm the same reporting standard as the top institutional shops.
          </p>
        </div>

        {/* 3 Steps */}
        <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: 0, borderRadius: 14, border: `1px solid ${W.border}`, overflow: "hidden", marginBottom: 20 }}>
          {[
            { num: "1", time: "30 sec", title: "Set up your property", desc: "Name, address, unit count.", mKey: "step1" },
            { num: "2", time: "3 min", title: "Upload T-12 & answer questions", desc: "We extract every line item automatically.", mKey: "step2" },
            { num: "3", time: "~90 sec", title: "Engine analyzes & verifies", desc: "Three-layer math verification.", mKey: "math" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: m ? "14px 16px" : "20px 22px", background: W.bg, borderRight: !m && i < 2 ? `1px solid ${W.border}` : "none", borderBottom: m && i < 2 ? `1px solid ${W.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.accent }}>{s.num}</div>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: W.textMuted, background: W.bgAlt, padding: "3px 8px", borderRadius: 6 }}>{s.time}</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.5, marginBottom: 6 }}>{s.desc}</div>
              <button onClick={() => setModal(s.mKey)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, padding: 0, textDecoration: "underline", minHeight: 32 }}>
                {i === 2 ? "How math verification works" : "Learn more"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 16, padding: m ? "10px 12px" : "12px 20px", borderRadius: 12, background: W.bgAlt, border: `1px solid ${W.border}` }}>
          <span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid }}><strong style={{ color: W.text }}>Under 5 minutes.</strong> The same deliverable takes 6-8 hours manually — with no verification.</span>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16, fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.6 }}>
          WriteUp AI is a complete reporting platform — not a one-off generator.{" "}
          <button onClick={() => setModal("platform")} style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", padding: 0, textDecoration: "underline" }}>Explore your reporting platform</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16, fontFamily: F.body, fontSize: 11, color: W.textMuted }}>
          <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.textMuted} s={12} />
          SOC 2 architecture. End-to-end encryption. Row-level data isolation.
        </div>

        <div style={{ maxWidth: m ? "100%" : 420, margin: "0 auto" }}>
          <Btn onClick={onNext} m={m}>Show Me What My Report Includes <Arr /></Btn>
        </div>
      </div>

      {/* ── MODALS ── */}
      {modal === "research" && <Modal title="The Research Behind WriteUp AI" onClose={() => setModal(null)} m={m}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
          <ModalRow icon="M12 20V10M18 20V4M6 20v-4" title="74% of institutional LPs" desc="rank reporting quality as their #1 criterion when selecting a fund manager — above past performance." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" title="92% investor retention" desc="Origin Investments directly attributes this to the quality of its quarterly reporting." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1" title="Real cost of bad reports" desc="Lost trust, failed re-ups, and slower fundraising. Firms that treat reporting as a competitive advantage consistently outperform on capital retention." />
          <p style={{ marginTop: 12 }}>WriteUp AI was built to give every multifamily PE firm the same reporting standard the top institutional shops use.</p>
        </div>
      </Modal>}

      {modal === "step1" && <Modal title="Property Setup" onClose={() => setModal(null)} m={m}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>For your complimentary report, we just need the basics. As a subscriber:</p>
          <ModalRow icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" iconColor={W.green} iconBg={W.greenBg} title="Investment Strategy" desc="Define your value-add thesis once. Every report tracks performance against it." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" iconColor={W.green} iconBg={W.greenBg} title="Budget Upload" desc="Upload once per year. Every report includes automatic budget vs. actual variance." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" iconColor={W.green} iconBg={W.greenBg} title="One-Click Monthly" desc="Settings persist. Next month: upload T-12, click Generate. Done." />
        </div>
      </Modal>}

      {modal === "step2" && <Modal title="Data Extraction & Guided Questions" onClose={() => setModal(null)} m={m}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
          <ModalRow icon="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" title="Source Data Registry" desc="We parse your T-12 and build a canonical set of verified values — the single source of truth for every section." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" title="PDF, Excel, or CSV" desc="Drop in whatever format you have. Revenue and expense line items extracted automatically." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" title="Dynamic Questionnaire" desc="Questions adapt to your enabled sections. Disable Capital Improvements — the related question disappears." />
        </div>
      </Modal>}

      {modal === "math" && <Modal title="Three-Layer Math Verification" onClose={() => setModal(null)} m={m}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>Every calculation is independently verified. <strong>Zero AI hallucinations. Zero financial errors. Guaranteed.</strong></p>
          <ModalRow icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" iconColor={W.green} iconBg={W.greenBg} title="Layer 1 — Input Verification" desc="Every value traced back to your source T-12. Mismatches corrected automatically." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" iconColor={W.green} iconBg={W.greenBg} title="Layer 2 — Formula Verification" desc="15+ registered formulas checked — NOI, EGI, DSCR, expense ratio, per-unit metrics." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M12 20V10M18 20V4M6 20v-4" iconColor={W.green} iconBg={W.greenBg} title="Layer 3 — Arithmetic Verification" desc="Every formula re-computed by deterministic math engine. Overrides any AI deviation." />
          <div style={{ padding: "12px 14px", borderRadius: 10, background: W.greenBg, border: `1px solid ${W.green}20`, marginTop: 12 }}>
            <div style={{ fontWeight: 600, color: W.green, marginBottom: 3 }}>Full Audit Trail</div>
            <div style={{ color: W.textMid, fontSize: 12 }}>Expand any section to see every correction — original value, corrected value, confidence level.</div>
          </div>
          <p style={{ marginTop: 10, fontStyle: "italic", color: W.textSoft, fontSize: 12 }}>This verification is proprietary to WriteUp AI. Not available in any general-purpose AI tool.</p>
        </div>
      </Modal>}

      {modal === "platform" && <Modal title="Your Reporting Platform" onClose={() => setModal(null)} m={m}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", padding: "4px 0", WebkitOverflowScrolling: "touch" as any }}>
            {["Draft", "In Review", "Final Review", "Ready to Send", "Delivered"].map((stage, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{ padding: "5px 10px", borderRadius: 8, background: i === 4 ? W.greenBg : i === 3 ? W.goldBg : `${W.accent}08`, border: `1px solid ${i === 4 ? W.green : i === 3 ? W.gold : W.accent}20`, fontSize: 10, fontWeight: 600, color: i === 4 ? W.green : i === 3 ? W.gold : W.accent, whiteSpace: "nowrap" as const }}>{stage}</div>
                {i < 4 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
              </div>
            ))}
          </div>
          <ModalRow icon="M13 10V3L4 14h7v7l9-11h-7z" title="Generate" desc="Upload T-12, answer questions, get a report in under 2 minutes." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" title="Review & Edit" desc="Edit inline. Regenerate with instructions. Control paragraph length." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" title="Collaborate" desc="Team roles. Analysts draft, managers review, partners approve." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" title="Brand & Configure" desc="Logo, colors, disclaimers, section order. Set once, generate consistently." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" title="Export & Deliver" desc="PDF, HTML, or rich email-ready. 'View Full Report' for investors — no login required." />
          <div style={{ borderBottom: `1px solid ${W.borderL}` }} />
          <ModalRow icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" title="Archive" desc="Reports stored chronologically. Full history by property, every month." />
        </div>
      </Modal>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 2: SECTIONS (drag-and-drop + expandable)
// ═══════════════════════════════════════════════════════════

function Screen2({ onNext, onBack, m }: { onNext: () => void; onBack: () => void; m: boolean }) {
  const freeSecs = ALL_SECTIONS.filter(s => FREE_IDS.includes(s.id));
  const [sections, setSections] = useState(freeSecs);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const pro = ALL_SECTIONS.filter(s => s.tier !== "institutional" && !FREE_IDS.includes(s.id));
  const inst = ALL_SECTIONS.filter(s => s.tier === "institutional");

  const toggle = (id: string) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };
  const onDS = (i: number) => setDragIdx(i);
  const onDO = (e: React.DragEvent, i: number) => { e.preventDefault(); if (dragIdx === null || dragIdx === i) return; const n = [...sections]; const [mv] = n.splice(dragIdx, 1); n.splice(i, 0, mv); setSections(n); setDragIdx(i); };
  const onDE = () => setDragIdx(null);

  return (
    <div style={{ overflowX: "hidden", padding: m ? "24px 16px" : "44px 44px 32px", maxWidth: 640, margin: "0 auto" }}>
      <Dots current={1} total={5} m={m} />
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: F.display, fontSize: m ? 24 : 32, fontWeight: 500, color: W.text, margin: "0 0 8px" }}>Here&apos;s what we&apos;re building for you</h2>
        <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textSoft, lineHeight: 1.6, margin: "0 auto", maxWidth: 540 }}>5 Professional-level sections. Drag to reorder. Tap to see what&apos;s inside.</p>
      </div>

      <div style={{ padding: "12px 14px", borderRadius: 12, background: `${W.accent}06`, border: `1px solid ${W.accent}12`, marginBottom: 14, fontFamily: F.body, fontSize: 12, color: W.textMid, lineHeight: 1.6 }}>
        <strong style={{ color: W.text }}>As a subscriber, you control everything.</strong> Choose sections, drag to reorder, set paragraph length, add disclaimers.
      </div>

      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>Generating for your report — drag to reorder</div>

      {sections.map((s, i) => {
        const open = expanded.has(s.id);
        return (
          <div key={s.id} draggable onDragStart={() => onDS(i)} onDragOver={e => onDO(e, i)} onDragEnd={onDE}
            style={{ padding: m ? "10px 10px" : "12px 14px", cursor: "grab", borderBottom: `1px solid ${W.borderL}`, background: dragIdx === i ? `${W.accent}06` : `${W.gold}04`, borderRadius: dragIdx === i ? 8 : 0, transition: "background 0.15s" }}>
            <div onClick={() => toggle(s.id)} style={{ display: "flex", alignItems: "center", gap: m ? 6 : 10, cursor: "pointer" }}>
              <GripIc /><Chk c={W.gold} />
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, flex: 1 }}>{s.title}</span>
              {s.viz !== "—" && !m && <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, color: s.viz === "Conditional" ? W.gold : W.accent, background: s.viz === "Conditional" ? W.goldBg : `${W.accent}08`, padding: "2px 6px", borderRadius: 4 }}>{s.viz}</span>}
              <span style={{ fontFamily: F.body, fontSize: 8, fontWeight: 700, color: W.green, background: W.greenBg, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, border: `1px solid ${W.green}20` }}>Included</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {open && <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.6 }}>{s.desc}{s.vizD && <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: W.bg, border: `1px solid ${W.borderL}`, fontSize: 11, color: W.textMid }}><strong>Visualization:</strong> {s.vizD}</div>}</div>}
          </div>
        );
      })}

      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: "12px 0 4px", marginTop: 8 }}>Professional — 5 more</div>
      {pro.map(s => {
        const open = expanded.has(s.id);
        return (
          <div key={s.id} onClick={() => toggle(s.id)} style={{ display: "flex", flexDirection: "column" as const, padding: "9px 14px", borderBottom: `1px solid ${W.borderL}`, opacity: 0.6, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LockIc /><span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: W.textMid, flex: 1 }}>{s.title}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {open && <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.6 }}>{s.desc}</div>}
          </div>
        );
      })}

      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.navy, textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: "10px 0 4px" }}>Institutional — 5 additional</div>
      {inst.map(s => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: `1px solid ${W.borderL}`, opacity: 0.4 }}><LockIc /><span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: W.textMid }}>{s.title}</span></div>)}

      <div style={{ marginTop: 20 }}>
        <Btn onClick={onNext} m={m}>Next: Set Up Your Property <Arr /></Btn>
        <BackBtn onClick={onBack} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 3: UPLOAD + BRAND (custom color picker, live preview)
// ═══════════════════════════════════════════════════════════

function Screen3({ onNext, onBack, m, formData, setFormData }: {
  onNext: () => void; onBack: () => void; m: boolean;
  formData: FormState; setFormData: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const t12Ref = useRef<HTMLInputElement>(null);
  const rrRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleT12 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, t12File: f })); };
  const handleRR = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, rentRollFile: f })); };
  const canProceed = formData.propertyName.trim() && formData.unitCount.trim() && formData.t12File;

  return (
    <div style={{ overflowX: "hidden", padding: m ? "24px 16px" : "32px 40px", maxWidth: 820, margin: "0 auto" }}>
      <Dots current={2} total={5} m={m} />
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: F.display, fontSize: m ? 24 : 28, fontWeight: 500, color: W.text, margin: "0 0 6px" }}>Now let&apos;s build your report</h2>
        <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textSoft, margin: 0 }}>Upload your T-12 and choose a brand color. We&apos;ll handle the rest.</p>
      </div>

      <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 20 : 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Property fields */}
          <div style={{ background: W.bgAlt, borderRadius: 12, padding: m ? 14 : 18, border: `1px solid ${W.border}`, marginBottom: 12 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>Property</div>
            {[
              { l: "Property Name *", p: "e.g. The Heights at Montrose", k: "propertyName" as const },
              { l: "Unit Count *", p: "e.g. 312", k: "unitCount" as const },
              { l: "Address", p: "4500 Montrose Blvd, Houston, TX", k: "address" as const },
              { l: "Company Name", p: "e.g. Walker Capital Group", k: "companyName" as const },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 4 }}>{f.l}</label>
                <input value={formData[f.k] as string} onChange={e => setFormData(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k === "unitCount" ? "number" : "text"}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 44 }} />
              </div>
            ))}
          </div>

          {/* Colors */}
          <div style={{ background: W.bgAlt, borderRadius: 12, padding: m ? 14 : 18, border: `1px solid ${W.border}`, marginBottom: 12 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>Report Colors</div>
            <div style={{ display: "grid", gridTemplateColumns: m ? "1fr 1fr" : "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
              {PRESETS.map((pr, i) => (
                <button key={i} onClick={() => { setFormData(p => ({ ...p, preset: i, customColor: "" })); setShowPicker(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 8px", borderRadius: 8, minHeight: 44, border: !formData.customColor && formData.preset === i ? `2px solid ${W.accent}` : `1px solid ${W.border}`, background: !formData.customColor && formData.preset === i ? `${W.accent}06` : W.bg, cursor: "pointer" }}>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>{[pr.primary, pr.secondary, pr.accent].map((c, j) => <div key={j} style={{ width: 14, height: 14, borderRadius: 4, background: c, border: j === 1 ? `1px solid ${W.borderL}` : "none" }} />)}</div>
                  <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: W.textMid }}>{pr.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPicker(!showPicker)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: formData.customColor ? `2px solid ${W.accent}` : `1px dashed ${W.border}`, background: formData.customColor ? `${W.accent}06` : "transparent", cursor: "pointer", width: "100%", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.accent, minHeight: 40 }}>
              {formData.customColor && <div style={{ width: 16, height: 16, borderRadius: 4, background: formData.customColor }} />}
              {formData.customColor ? "Custom color selected" : "+ Use custom brand color"}
            </button>
            {showPicker && <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={formData.customColor || "#1B2A4A"} onChange={e => setFormData(p => ({ ...p, customColor: e.target.value }))} style={{ width: 48, height: 48, borderRadius: 8, border: "none", cursor: "pointer", padding: 0 }} /><span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid }}>Pick your primary brand color</span></div>}
          </div>

          {/* T-12 Upload */}
          <input ref={t12Ref} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleT12} style={{ display: "none" }} />
          <div onClick={() => t12Ref.current?.click()} style={{ border: `2px dashed ${formData.t12File ? W.green : W.accent}40`, borderRadius: 12, padding: m ? 20 : 28, textAlign: "center", background: formData.t12File ? W.greenBg : `${W.accent}03`, cursor: "pointer", marginBottom: 8 }}>
            {formData.t12File ? <><Chk c={W.green} s={24} /><div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green, marginTop: 6 }}>{formData.t12File.name}</div><div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginTop: 2 }}>Click to replace</div></> : <><div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.text }}>Upload T-12 <span style={{ color: W.red }}>*</span></div><div style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted, marginTop: 4 }}>PDF, Excel, or CSV</div></>}
          </div>

          {/* Rent Roll */}
          <input ref={rrRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleRR} style={{ display: "none" }} />
          <div onClick={() => rrRef.current?.click()} style={{ border: `1px dashed ${formData.rentRollFile ? W.green : W.border}`, borderRadius: 10, padding: 14, textAlign: "center", background: formData.rentRollFile ? W.greenBg : W.bgWarm, marginBottom: 12, cursor: "pointer", minHeight: 44 }}>
            {formData.rentRollFile ? <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>{formData.rentRollFile.name}</span> : <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.textMid }}>Rent Roll <span style={{ fontWeight: 400, color: W.textMuted }}>(optional)</span></span>}
          </div>
        </div>

        {/* Preview — desktop only */}
        {!m && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8, textAlign: "center" }}>Live Preview</div>
            <ReportPreview preset={formData.preset} propertyName={formData.propertyName} companyName={formData.companyName} customColor={formData.customColor} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: W.bgAlt, fontFamily: F.body, fontSize: 10, color: W.textSoft, marginTop: 12, marginBottom: 16 }}>
        <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.textMuted} s={10} />
        Encrypted. Row-level security. Your data stays private.
      </div>

      <Btn onClick={onNext} disabled={!canProceed} m={m}>Next: Guided Questions <Arr /></Btn>
      <BackBtn onClick={onBack} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 4: GUIDED QUESTIONS
// ═══════════════════════════════════════════════════════════

function Screen4({ onNext, onBack, m, questions, setQuestions }: {
  onNext: () => void; onBack: () => void; m: boolean;
  questions: QuestionState; setQuestions: React.Dispatch<React.SetStateAction<QuestionState>>;
}) {
  return (
    <div style={{ overflowX: "hidden", padding: m ? "24px 16px" : "32px 40px", maxWidth: 560, margin: "0 auto" }}>
      <Dots current={3} total={5} m={m} />
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: F.display, fontSize: m ? 24 : 28, fontWeight: 500, color: W.text, margin: "0 0 6px" }}>A few quick details to personalize your report</h2>
        <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textSoft, margin: 0, lineHeight: 1.6 }}>Skip any you don&apos;t know. Subscribers get dynamic questions based on enabled sections.</p>
      </div>

      {/* Occupancy */}
      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>For: Occupancy & Leasing</div>
      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[{ l: "Move-ins this month", p: "e.g. 8", k: "moveIns" as const }, { l: "Move-outs this month", p: "e.g. 5", k: "moveOuts" as const }].map((q, i) => (
          <div key={i}>
            <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 4 }}>{q.l} <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 11 }}>optional</span></label>
            <input type="number" placeholder={q.p} value={questions[q.k]} onChange={e => setQuestions(p => ({ ...p, [q.k]: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 48 }} />
          </div>
        ))}
      </div>

      {/* Revenue/Expense/NOI */}
      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>For: Revenue, Expense & NOI</div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 4 }}>Any notable financial changes? <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 11 }}>optional</span></label>
        <textarea placeholder="Insurance renewal, utility rebates, renovation costs..." rows={3} value={questions.financialChanges} onChange={e => setQuestions(p => ({ ...p, financialChanges: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 80 }} />
        <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMid, marginTop: 2 }}>The engine weaves this into Revenue, Expense, and NOI narrative automatically.</div>
      </div>

      {/* Exec Summary & Distribution */}
      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.gold, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>For: Executive Summary & Distribution</div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 4 }}>Distribution status <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 11 }}>optional</span></label>
        <select value={questions.distributionStatus} onChange={e => setQuestions(p => ({ ...p, distributionStatus: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.textSoft, outline: "none", boxSizing: "border-box" as const, minHeight: 48 }}>
          <option value="">Select one</option>
          {["On Track", "Delayed", "Suspended", "Not Applicable"].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 4 }}>Asset manager&apos;s monthly notes <span style={{ fontWeight: 400, color: W.textMuted, fontSize: 11 }}>optional</span></label>
        <textarea placeholder="Capital projects, staffing, market observations..." rows={3} value={questions.assetManagerNotes} onChange={e => setQuestions(p => ({ ...p, assetManagerNotes: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 80 }} />
      </div>

      <Btn onClick={onNext} gradient m={m}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        Generate My Report
      </Btn>
      <BackBtn onClick={onBack} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GENERATING PAGE — Scrollable landing page
// Sticky progress bar, math verification, review carousel,
// full pricing with billing toggle, platform features.
// "Your report is ready" banner slides in when done.
// ═══════════════════════════════════════════════════════════

function GeneratingPage({ reportReady, onContinue, m }: { reportReady: boolean; onContinue: () => void; m: boolean }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Uploading files...");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    if (reportReady) { setProgress(100); setPhase("Report complete"); return; }
    const phases = [
      { p: 8, l: "Extracting financial data..." }, { p: 20, l: "Parsing T-12 line items..." },
      { p: 35, l: "Building source data registry..." }, { p: 50, l: "Generating Executive Summary..." },
      { p: 62, l: "Analyzing occupancy & leasing..." }, { p: 74, l: "Running revenue analysis..." },
      { p: 84, l: "Processing expense categories..." }, { p: 92, l: "Computing NOI performance..." },
      { p: 97, l: "Running three-layer math verification..." },
    ];
    let i = 0;
    const t = setInterval(() => { if (i < phases.length) { setProgress(phases[i].p); setPhase(phases[i].l); i++; } }, 3500);
    return () => clearInterval(t);
  }, [reportReady]);

  return (
    <div style={{ background: W.bg }}>
      {/* Sticky progress + ready banner */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: W.bg, borderBottom: `1px solid ${W.borderL}`, padding: m ? "10px 16px" : "12px 24px" }}>
        {reportReady ? (
          <div style={{ display: "flex", flexDirection: m ? "column" : "row", alignItems: "center", gap: m ? 10 : 16, padding: "14px 18px", borderRadius: 12, background: W.greenBg, border: `1px solid ${W.green}25` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${W.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Chk c={W.green} s={20} /></div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 16, fontWeight: 700, color: W.green }}>Your report is ready — 5 sections verified</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid }}>Math verified. 0 errors. Institutional quality confirmed.</div>
              </div>
            </div>
            <button onClick={onContinue} style={{ padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: W.green, color: "#fff", fontFamily: F.body, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" as const, width: m ? "100%" : "auto", justifyContent: "center", minHeight: 50, boxShadow: `0 4px 16px ${W.green}30` }}>
              View Your Report <Arr />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.accent} s={12} />
              </div>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>Generating your report</span>
              <span style={{ fontFamily: F.body, fontSize: 11, color: W.textMid, marginLeft: "auto" }}>{phase}</span>
            </div>
            <div style={{ width: "100%", height: 4, borderRadius: 100, background: W.borderL, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${W.accent}, ${W.accentDark})`, width: `${progress}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: m ? "0 16px 40px" : "0 32px 60px" }}>

        {/* Section 1: Math Verification */}
        <div style={{ padding: m ? "32px 0" : "48px 0", borderBottom: `1px solid ${W.borderL}` }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 22 : 30, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 8px" }}>Three-layer math verification</h3>
          <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textMid, textAlign: "center", maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.6 }}>Every calculation independently verified. Zero hallucinations. Zero errors.</p>
          {[
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", t: "Layer 1 — Input Verification", d: "Every value traced back to source. Mismatches corrected." },
            { icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", t: "Layer 2 — Formula Verification", d: "15+ registered formulas — NOI, EGI, DSCR, per-unit." },
            { icon: "M12 20V10M18 20V4M6 20v-4", t: "Layer 3 — Arithmetic Verification", d: "Every formula re-computed deterministically." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: W.greenBg, border: `1px solid ${W.green}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic d={item.icon} c={W.green} s={16} /></div>
              <div><div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: W.text }}>{item.t}</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.5 }}>{item.d}</div></div>
            </div>
          ))}
          <div style={{ padding: "14px 16px", borderRadius: 12, background: W.greenBg, border: `1px solid ${W.green}20`, marginTop: 16 }}>
            <div style={{ fontWeight: 600, color: W.green, fontFamily: F.body, fontSize: 14, marginBottom: 3 }}>Full Audit Trail Included</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>Expand any section to see every correction — original value, corrected value, confidence level.</div>
          </div>
        </div>

        {/* Section 2: Reviews */}
        <div style={{ padding: m ? "32px 0" : "48px 0", borderBottom: `1px solid ${W.borderL}` }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 22 : 30, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 24px" }}>What firms like yours are experiencing</h3>
          <ReviewCarousel m={m} />
        </div>

        {/* Section 3: Full Pricing */}
        <div style={{ padding: m ? "32px 0" : "48px 0", borderBottom: `1px solid ${W.borderL}` }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 22 : 30, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 6px" }}>The right plan for your firm</h3>
          <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textSoft, textAlign: "center", margin: "0 auto 16px", maxWidth: 520 }}>Every tier uses the same engine, same verification, same export quality. The difference is depth, customization, and team size.</p>

          {/* Billing toggle */}
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
            {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map(c => (
              <button key={c} onClick={() => setCycle(c)} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: cycle === c ? 600 : 500, background: cycle === c ? W.accent : "transparent", color: cycle === c ? "#fff" : W.textMid, border: cycle === c ? "none" : `1px solid ${W.border}`, minHeight: 40 }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {DISC[c] > 0 && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: cycle === c ? "#fff" : W.green, background: cycle === c ? "rgba(255,255,255,0.2)" : W.greenBg, padding: "1px 5px", borderRadius: 4 }}>-{DISC[c]}%</span>}
              </button>
            ))}
          </div>

          <div style={{ display: m ? "flex" : "grid", flexDirection: m ? "column" : undefined, gridTemplateColumns: m ? undefined : "1fr 1fr 1fr", gap: 12 }}>
            {([
              { tier: "foundational" as const, name: "Foundational", tag: "YOUR FREE REPORT", tagC: W.gold, tagBg: W.goldBg, featured: false, items: ["4 report sections", "T-12 financial analysis", "Proprietary 3-layer math verification", "PDF, HTML & rich email-ready export", "Custom disclaimer", "1 user"] },
              { tier: "professional" as const, name: "Professional", tag: "MOST POPULAR", tagC: W.accent, tagBg: `${W.accent}10`, featured: true, items: ["10 sections with inline charts", "T-12 + rent roll deep analysis", "Budget vs. actual variance", "Custom branding (logo, colors, tone)", "Section builder with length controls", "Editable sections with AI regeneration", "Report pipeline with approval stages", "3 team members"] },
              { tier: "institutional" as const, name: "Institutional", tag: "ENTERPRISE", tagC: W.navy, tagBg: W.navyBg, featured: false, items: ["15 sections — full institutional depth", "Everything in Professional", "Investment thesis tracking", "Custom report templates", "API access", "10 team members", "Dedicated account manager", "SLA guarantee"] },
            ]).map((plan, i) => (
              <div key={i} style={{ padding: m ? 20 : 22, borderRadius: 14, background: W.bg, border: plan.featured ? `2px solid ${W.accent}` : `1px solid ${W.border}` }}>
                <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: plan.tagC, background: plan.tagBg, padding: "3px 10px", borderRadius: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em", border: `1px solid ${plan.tagC}15` }}>{plan.tag}</span>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.textMid, marginTop: 10, marginBottom: 2 }}>{plan.name}</div>
                <div style={{ fontFamily: F.display, fontSize: m ? 30 : 28, fontWeight: 600, color: W.text, marginBottom: 2 }}>${perMo(plan.tier, cycle)}<span style={{ fontSize: 13, fontWeight: 400, color: W.textSoft }}>/property/mo</span></div>
                {cycle !== "monthly" && <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginBottom: 8 }}><span style={{ textDecoration: "line-through" }}>${PRICING[plan.tier].monthly}</span><span style={{ marginLeft: 4, color: W.green, fontWeight: 600 }}>Save {DISC[cycle]}%</span></div>}
                {cycle === "monthly" && <div style={{ height: 8 }} />}
                {plan.items.map((item, j) => <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0" }}><Chk c={W.green} s={12} /><span style={{ fontFamily: F.body, fontSize: 12, color: W.textMid, lineHeight: 1.4 }}>{item}</span></div>)}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontFamily: F.body, fontSize: 11, color: W.textMuted }}>Per-property pricing. Upgrade, downgrade, or cancel anytime.</div>
          <div style={{ textAlign: "center", marginTop: 4, fontFamily: F.body, fontSize: 12, color: W.textMid }}>Not choosing now — let&apos;s build your complimentary report first.</div>
        </div>

        {/* Section 4: Features */}
        <div style={{ padding: m ? "32px 0" : "48px 0" }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 22 : 30, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 20px" }}>What subscribers use every month</h3>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 10 }}>
            {[
              { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", t: "Upload budget once", d: "Automatic variance analysis in every report." },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", t: "Set strategy once", d: "Track performance against your acquisition thesis." },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7", t: "Team workspace", d: "Roles, approvals, and pipeline notifications." },
              { icon: "M5 12h14M12 5l7 7-7 7", t: "Report pipeline", d: "Draft, Review, Approve, Send, Archive." },
              { icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z", t: "Full section control", d: "Order, length, disclaimers. Set once, run monthly." },
              { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", t: "Export for any platform", d: "PDF, HTML, or rich email-ready format." },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 10, background: W.bgAlt, border: `1px solid ${W.borderL}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic d={f.icon} c={W.accent} s={14} /></div>
                <div><div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.text, marginBottom: 2 }}>{f.t}</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.5 }}>{f.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 5: DELIVERED (CTAs on same page, no redirect)
// ═══════════════════════════════════════════════════════════

function Screen5({ userEmail, reportId, onBookDemo, m }: {
  userEmail: string; reportId: string | null; onBookDemo: () => void; m: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(userEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendAndView = async () => {
    if (!email || !reportId) return;
    setSending(true);
    try {
      const res = await fetch("/api/free-report/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reportId }),
      });
      const data = await res.json().catch(() => ({}));
      setSent(true);

      // Schedule follow-up email 1 — 2 min after
      setTimeout(() => {
        fetch("/api/free-report/follow-up", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, email, propertyName: data.propertyName || "your property", emailNumber: 1 }),
        }).catch(() => {});
      }, 120_000);

      // Navigate to public report viewer
      setTimeout(() => { router.push(`/report/${reportId}`); }, 1500);
    } catch (err) {
      console.error("Send failed:", err);
      setSending(false);
    }
  };

  return (
    <div style={{ overflowX: "hidden", padding: m ? "24px 16px" : "44px 44px 32px", maxWidth: 560, margin: "0 auto" }}>
      <Dots current={4} total={5} m={m} />
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 100, background: W.greenBg, border: `1px solid ${W.green}20`, marginBottom: 16 }}>
          <Chk c={W.green} s={16} />
          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>Your report is ready</span>
        </div>
        <h2 style={{ fontFamily: F.display, fontSize: m ? 26 : 32, fontWeight: 500, color: W.text, margin: "0 0 8px" }}>
          Where should we <span style={{ color: W.accent }}>deliver your report?</span>
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 14, color: W.textSoft, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 16px" }}>
          We&apos;ll email it exactly as your investors would receive it — branded summary with a &ldquo;View Full Report&rdquo; button. No login required.
        </p>

        <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: m ? "column" : "row", gap: 8, marginBottom: 24 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: `1px solid ${W.border}`, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 48 }} />
          <button onClick={handleSendAndView} disabled={sending || sent || !reportId} style={{ padding: "14px 24px", background: sent ? W.green : W.accent, color: "#fff", border: "none", borderRadius: 10, cursor: sending || sent ? "default" : "pointer", fontFamily: F.body, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" as const, minHeight: 48, width: m ? "100%" : "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: sending ? 0.7 : 1 }}>
            {sent ? <><Chk c="#fff" s={16} /> Sent</> : sending ? "Sending..." : "Send & View Report"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: W.border, marginBottom: 24 }} />

      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontFamily: F.display, fontSize: m ? 20 : 24, fontWeight: 500, color: W.text, margin: "0 0 6px" }}>Ready to streamline your reporting?</h3>
        <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, marginBottom: 16 }}>Every plan includes immediate access and a live onboarding session.</p>
        <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: 10, maxWidth: 420, margin: "0 auto 20px" }}>
          <button onClick={() => router.push("/dashboard/pricing")} style={{ flex: 1, padding: "14px 20px", background: W.accent, color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: F.body, fontSize: 14, fontWeight: 600, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 16px ${W.accent}25` }}>
            <Arr /> Choose a Plan
          </button>
          <button onClick={onBookDemo} style={{ flex: 1, padding: "14px 20px", background: W.bg, color: W.navy, border: `1px solid ${W.navy}25`, borderRadius: 12, cursor: "pointer", fontFamily: F.body, fontSize: 14, fontWeight: 600, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Book a Demo
          </button>
        </div>

        {/* Demo value prop */}
        <div style={{ padding: m ? 16 : 20, borderRadius: 14, background: W.navyBg, border: `1px solid ${W.navy}12`, maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.navy, marginBottom: 6 }}>What happens on the demo call?</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.6, textAlign: "left" as const }}>
            In 25 minutes, we generate a report from your actual T-12 — live on the call. You&apos;ll see the Report Designer, team workflows, and the full export pipeline your investors receive. Bring a T-12 and leave with a complete report you can send the same day.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FormState {
  propertyName: string;
  unitCount: string;
  address: string;
  companyName: string;
  preset: number;
  customColor: string;
  t12File: File | null;
  rentRollFile: File | null;
}

interface QuestionState {
  moveIns: string;
  moveOuts: string;
  financialChanges: string;
  distributionStatus: string;
  assetManagerNotes: string;
}

// ═══════════════════════════════════════════════════════════
// DEMO BOOKING MODAL (qualifying → calendar → confirm)
// ═══════════════════════════════════════════════════════════

const CALENDLY_URL = "https://calendly.com/yourpropertyoffers/writeup-ai-platform-walkthrough";

function DemoBookingModal({ onClose, userEmail, userName, m }: { onClose: () => void; userEmail: string; userName: string; m: boolean }) {
  const [demoStep, setDemoStep] = useState(0);
  const [propertyCount, setPropertyCount] = useState("");
  const [reportFrequency, setReportFrequency] = useState("");
  const [budgetFit, setBudgetFit] = useState<"yes" | "no" | "">("");
  const [countdown, setCountdown] = useState(175);
  const [leadEmail, setLeadEmail] = useState(userEmail);
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSent, setLeadSent] = useState(false);

  const parsed = parseInt(propertyCount, 10);
  const valid = !isNaN(parsed) && parsed > 0;
  const price = valid ? parsed * PRICING.foundational.monthly : 0;
  const canGo = valid && reportFrequency && budgetFit === "yes";
  const fmtPrice = (n: number) => n.toLocaleString("en-US");
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => { if (demoStep !== 1) return; const t = setInterval(() => setCountdown(p => p <= 0 ? 0 : p - 1), 1000); return () => clearInterval(t); }, [demoStep]);
  useEffect(() => { const h = (e: MessageEvent) => { if (e.data?.event === "calendly.event_scheduled") setDemoStep(2); }; window.addEventListener("message", h); return () => window.removeEventListener("message", h); }, []);

  const calendlyUrl = `${CALENDLY_URL}?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=00B7DB${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""}${userName ? `&name=${encodeURIComponent(userName)}` : ""}`;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: m ? "flex-end" : "center", justifyContent: "center", zIndex: 300, padding: m ? 0 : 16, backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: m ? "16px 16px 0 0" : 20, width: "100%", maxWidth: demoStep === 1 ? (m ? "100%" : 720) : (m ? "100%" : 520), maxHeight: m ? "96vh" : "92vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: m ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${W.borderL}`, position: "sticky", top: 0, background: W.bg, zIndex: 1, borderRadius: m ? "16px 16px 0 0" : "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: m ? 6 : 10 }}>
            {[0, 1, 2].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: m ? 3 : 4 }}>
                <div style={{ width: m ? 22 : 24, height: m ? 22 : 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontSize: m ? 10 : 11, fontWeight: 700, background: demoStep >= s ? (demoStep > s ? W.greenBg : `${W.accent}12`) : W.bgAlt, color: demoStep >= s ? (demoStep > s ? W.green : W.accent) : W.textMuted, border: `1px solid ${demoStep >= s ? (demoStep > s ? `${W.green}30` : `${W.accent}25`) : W.border}` }}>
                  {demoStep > s ? <Chk c={W.green} s={10} /> : s + 1}
                </div>
                {s < 2 && <div style={{ width: m ? 12 : 20, height: 1, background: demoStep > s ? W.green : W.borderL }} />}
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: W.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Step 1: Qualify */}
        {demoStep === 0 && (
          <div style={{ padding: m ? "20px 16px" : "28px 32px" }}>
            <div style={{ textAlign: "center", marginBottom: m ? 18 : 24 }}>
              <div style={{ display: "inline-flex", padding: "5px 12px", borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>Step 1 of 3</div>
              <h3 style={{ fontFamily: F.display, fontSize: m ? 20 : 24, fontWeight: 500, color: W.text, marginBottom: 6 }}>Tell us about your portfolio</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft }}>Helps us prepare a walkthrough tailored to your firm. 30 seconds.</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text, display: "block", marginBottom: 6 }}>How many multifamily properties do you manage? <span style={{ color: W.red }}>*</span></label>
              <input type="number" min="1" placeholder="e.g. 8" value={propertyCount} onChange={e => { setPropertyCount(e.target.value); setBudgetFit(""); }} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 48 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text, display: "block", marginBottom: 6 }}>How often do you report to investors? <span style={{ color: W.red }}>*</span></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {["Monthly", "Quarterly", "Annually", "Not yet"].map(opt => (
                  <button key={opt} onClick={() => setReportFrequency(opt)} style={{ padding: m ? "10px 14px" : "10px 20px", borderRadius: 8, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 500, flex: m ? "1 1 calc(50% - 4px)" : "0 0 auto", background: reportFrequency === opt ? `${W.accent}10` : W.bg, color: reportFrequency === opt ? W.accent : W.textMid, border: reportFrequency === opt ? `2px solid ${W.accent}` : `1px solid ${W.border}`, textAlign: "center" as const, minHeight: 44 }}>{opt}</button>
                ))}
              </div>
            </div>

            {valid && reportFrequency && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ padding: m ? "16px 14px" : "20px 24px", borderRadius: 12, background: W.bgAlt, border: `1px solid ${W.border}`, marginBottom: 12 }}>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, marginBottom: 6 }}>Based on {parsed} {parsed === 1 ? "property" : "properties"}:</div>
                  <div style={{ fontFamily: F.display, fontSize: m ? 22 : 26, fontWeight: 600, color: W.text, marginBottom: 4 }}>Plans start at ${fmtPrice(price)}<span style={{ fontSize: 14, fontWeight: 400, color: W.textSoft }}>/mo</span></div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>We&apos;ll explore the right tier on the call.</div>
                </div>

                <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, display: "block", marginBottom: 8 }}>Does ${fmtPrice(price)}/mo work for your firm? <span style={{ color: W.red }}>*</span></label>
                <div style={{ display: "flex", gap: 10, flexDirection: m ? "column" : "row" }}>
                  <button onClick={() => setBudgetFit("yes")} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, textAlign: "center" as const, background: budgetFit === "yes" ? W.greenBg : W.bg, color: budgetFit === "yes" ? W.green : W.textMid, border: budgetFit === "yes" ? `2px solid ${W.green}30` : `1px solid ${W.border}`, minHeight: 48 }}>Yes, ${fmtPrice(price)}/mo works</button>
                  <button onClick={() => setBudgetFit("no")} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, textAlign: "center" as const, background: budgetFit === "no" ? W.bgAlt : W.bg, color: budgetFit === "no" ? W.textSoft : W.textMid, border: budgetFit === "no" ? `2px solid ${W.border}` : `1px solid ${W.border}`, minHeight: 48 }}>No, doesn&apos;t work right now</button>
                </div>

                {budgetFit === "no" && (
                  <div style={{ marginTop: 12, padding: m ? "16px 14px" : "20px 20px", borderRadius: 12, background: W.bgAlt, border: `1px solid ${W.border}` }}>
                    <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 6 }}>We understand — let us follow up when it makes sense.</div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, lineHeight: 1.5, marginBottom: 14 }}>Leave your info and we&apos;ll reach out with options. No pressure.</div>
                    {leadSent ? (
                      <div style={{ textAlign: "center" }}><Chk c={W.green} s={16} /><span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green, marginLeft: 6 }}>We&apos;ll be in touch</span></div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 10 }}><label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 3 }}>Email</label><input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${W.border}`, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 44 }} /></div>
                        <div style={{ marginBottom: 14 }}><label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, display: "block", marginBottom: 3 }}>Phone <span style={{ fontWeight: 400, color: W.textMuted }}>optional</span></label><input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} type="tel" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${W.border}`, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 44 }} /></div>
                        <button onClick={() => { console.log("[LEAD]", { email: leadEmail, phone: leadPhone, propertyCount: parsed, reportFrequency, budgetFit: "no" }); setLeadSent(true); }} disabled={!leadEmail && !leadPhone} style={{ width: "100%", padding: "11px 20px", borderRadius: 8, border: "none", cursor: leadEmail || leadPhone ? "pointer" : "not-allowed", background: leadEmail || leadPhone ? W.accent : W.textMuted, color: "#fff", fontFamily: F.body, fontSize: 13, fontWeight: 600, opacity: leadEmail || leadPhone ? 1 : 0.5, minHeight: 48 }}>Keep Me Posted</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {budgetFit !== "no" && (
              <button onClick={() => setDemoStep(1)} disabled={!canGo} style={{ width: "100%", padding: "14px 24px", borderRadius: 12, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? W.accent : W.textMuted, color: "#fff", fontFamily: F.body, fontSize: 15, fontWeight: 600, boxShadow: canGo ? `0 4px 16px ${W.accent}30` : "none", opacity: canGo ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 }}>See Available Times <Arr /></button>
            )}
          </div>
        )}

        {/* Step 2: Calendly */}
        {demoStep === 1 && (
          <div style={{ padding: m ? "14px 12px" : "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ display: "inline-flex", padding: "5px 12px", borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Step 2 of 3</div>
              <h3 style={{ fontFamily: F.display, fontSize: m ? 18 : 22, fontWeight: 500, color: W.text, marginBottom: 4 }}>Pick a time for your walkthrough</h3>
              <p style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft }}>25-minute live demo. Bring a T-12 — we&apos;ll generate your report on the call.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: m ? 8 : 12, padding: "8px 12px", borderRadius: 10, background: W.goldBg, border: `1px solid ${W.gold}20`, marginBottom: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span style={{ fontFamily: F.body, fontSize: m ? 11 : 12, fontWeight: 600, color: W.gold }}>Limited spots this week</span>
              {countdown > 0 && <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.gold, fontVariantNumeric: "tabular-nums" }}>{fmtTime(countdown)}</span>}
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${W.borderL}`, minHeight: m ? 480 : 500 }}>
              <iframe src={calendlyUrl} style={{ width: "100%", minHeight: m ? 520 : 580, border: "none" }} title="Book a demo" />
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button onClick={() => setDemoStep(0)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 12, color: W.textMuted, minHeight: 44, padding: "10px 16px" }}>← Back to questions</button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmed */}
        {demoStep === 2 && (
          <div style={{ padding: m ? "28px 16px" : "40px 32px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: W.greenBg, border: `1px solid ${W.green}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Chk c={W.green} s={28} /></div>
            <h3 style={{ fontFamily: F.display, fontSize: m ? 22 : 26, fontWeight: 500, color: W.text, marginBottom: 8 }}>Your call is confirmed</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, color: W.textMid, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 24px" }}>Check your email for the calendar invite. Come prepared with a recent T-12 — we&apos;ll generate your report live.</p>
            <div style={{ background: W.bgAlt, borderRadius: 12, padding: m ? "14px 16px" : "18px 24px", textAlign: "left" as const, maxWidth: 400, margin: "0 auto 24px", border: `1px solid ${W.border}` }}>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>Come prepared</div>
              {["Your most recent T-12 (PDF, Excel, or CSV)", "A property you want to see in report format", "Questions about your current reporting workflow"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0" }}><Chk c={W.accent} s={14} /><span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.4 }}>{item}</span></div>
              ))}
            </div>
            <button onClick={onClose} style={{ padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: W.accent, color: "#fff", fontFamily: F.body, fontSize: 14, fontWeight: 600, minHeight: 48 }}>Back to Your Report</button>
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
  const { m } = useResponsive();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    propertyName: "", unitCount: "", address: "", companyName: "",
    preset: 0, customColor: "", t12File: null, rentRollFile: null,
  });

  const [questions, setQuestions] = useState<QuestionState>({
    moveIns: "", moveOuts: "", financialChanges: "",
    distributionStatus: "", assetManagerNotes: "",
  });

  const goTo = (n: number) => { setStep(Math.max(0, Math.min(4, n))); window.scrollTo(0, 0); };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const fd = new globalThis.FormData();
      fd.append("propertyName", formData.propertyName);
      fd.append("unitCount", formData.unitCount);
      fd.append("address", formData.address);
      fd.append("companyName", formData.companyName);
      fd.append("preset", String(formData.preset));

      const presetColors = formData.customColor
        ? { primary: formData.customColor, secondary: "#FAFAFA", accent: W.accent }
        : PRESETS[formData.preset];
      fd.append("presetColors", JSON.stringify(presetColors));

      fd.append("questionnaire", JSON.stringify({
        move_ins: questions.moveIns || null,
        move_outs: questions.moveOuts || null,
        financial_changes: questions.financialChanges || null,
        distribution_status: questions.distributionStatus || null,
        asset_manager_notes: questions.assetManagerNotes || null,
      }));

      if (formData.t12File) fd.append("t12", formData.t12File);
      if (formData.rentRollFile) fd.append("rentRoll", formData.rentRollFile);

      const setupRes = await fetch("/api/free-report/generate", { method: "POST", body: fd });
      if (!setupRes.ok) { const d = await setupRes.json().catch(() => ({})); throw new Error(d.error || "Failed to set up report"); }

      const setupData = await setupRes.json();
      setReportId(setupData.reportId);

      const genRes = await fetch("/api/reports/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: setupData.reportId, propertyId: setupData.propertyId,
          selectedMonth: setupData.selectedMonth, selectedYear: setupData.selectedYear,
          tier: setupData.tier, distributionStatus: setupData.questionnaire?.distribution_status || "",
          distributionNote: "", questionnaireAnswers: setupData.questionnaire || {},
          streaming: false,
        }),
      });

      if (!genRes.ok) console.error("[FREE-REPORT] Generation trigger failed:", genRes.status);
      setReportReady(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(false);
    }
  }, [formData, questions]);

  // Generating screen
  if (generating) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
        <TopBar m={m} />
        <GeneratingPage reportReady={reportReady} onContinue={() => { setGenerating(false); setReportReady(false); goTo(4); }} m={m} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
        <TopBar m={m} />
        <div style={{ padding: m ? "48px 16px" : "80px 44px", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${W.red}08`, border: `1px solid ${W.red}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={W.red} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <h2 style={{ fontFamily: F.display, fontSize: m ? 22 : 24, fontWeight: 500, color: W.text, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, marginBottom: 24 }}>{error}</p>
          <div style={{ maxWidth: 300, margin: "0 auto" }}><Btn onClick={() => { setError(null); goTo(3); }} m={m}>Try Again</Btn></div>
        </div>
      </div>
    );
  }

  // Main flow — 5 screens (0-4)
  // Screen 4 = Delivered (step 4 in the UI shows as dot 5 of 5)
  return (
    <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
      <TopBar m={m} />
      {step === 0 && <Screen1 onNext={() => goTo(1)} m={m} />}
      {step === 1 && <Screen2 onNext={() => goTo(2)} onBack={() => goTo(0)} m={m} />}
      {step === 2 && <Screen3 onNext={() => goTo(3)} onBack={() => goTo(1)} m={m} formData={formData} setFormData={setFormData} />}
      {step === 3 && <Screen4 onNext={handleGenerate} onBack={() => goTo(2)} m={m} questions={questions} setQuestions={setQuestions} />}
      {step === 4 && <Screen5 userEmail={userEmail} reportId={reportId} onBookDemo={() => setShowDemoModal(true)} m={m} />}
      {showDemoModal && <DemoBookingModal onClose={() => setShowDemoModal(false)} userEmail={userEmail} userName={userName} m={m} />}
    </div>
  );
}
