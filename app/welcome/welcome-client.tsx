// app/welcome/welcome-client.tsx
// WriteUp AI — Onboarding Funnel v10 (Production)
// Route: /welcome — standalone, no sidebar
// Flow: Hook → Sections → Upload+Brand → Questions → Generating → Delivered
// ALL inline styles. No Tailwind. No emojis. SVG icons only.

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import GuidedQuestions from "./guided-questions";
import GeneratingPage from "./generating-page";
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

function useScrollReveal(offset = 0.7) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh;
      const end = vh * (1 - offset);
      const progress = 1 - (rect.top - end) / (start - end);
      setRatio(Math.max(0, Math.min(1, progress)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return [ref, ratio] as const;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
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
  { id: "executive_summary", title: "Executive Summary", desc: "Update your investors on overall property performance at a glance. KPI cards display NOI, revenue, occupancy, and expenses with month-over-month trends and budget variance — the first thing your LPs read.", tier: "foundational", viz: "KPI Cards", vizD: "4-5 key metric cards with trend indicators" },
  { id: "occupancy_leasing", title: "Occupancy & Leasing", desc: "Update your investors on physical and economic occupancy, move-in and move-out velocity, lease renewal rates, and concession trends. Includes an occupancy gauge comparing actual to budget targets.", tier: "foundational", viz: "Occupancy Gauge", vizD: "Occupancy gauge with physical vs. economic comparison" },
  { id: "revenue_analysis", title: "Revenue Analysis", desc: "Update your investors on the full revenue picture. A GPR-to-EGI waterfall chart itemizes every deduction — vacancy loss, loss-to-lease, concessions, bad debt — so LPs see exactly where revenue stands.", tier: "foundational", viz: "Waterfall", vizD: "Revenue waterfall chart showing GPR to total revenue bridge" },
  { id: "expense_analysis", title: "Expense Analysis", desc: "Update your investors on operating expenses ranked by dollar impact. Category-level breakdown with actual vs. budget variance and month-over-month change flags cost overruns before they compound.", tier: "foundational", viz: "Expense Bars", vizD: "Horizontal bar chart ranking expense categories" },
  { id: "noi_performance", title: "Net Operating Income", desc: "Update your investors on the metric that matters most. NOI actual vs. budget vs. prior month, margin analysis, per-unit metrics, and a trailing 12-month trend chart that tells the full story.", tier: "foundational", viz: "NOI Trend", vizD: "NOI trend chart with budget comparison" },
  { id: "rent_roll_insights", title: "Rent Roll Insights", desc: "Update your investors on unit-level economics. Average rent by floorplan, market vs. effective rent comparison, vacancy duration, and lease expiration concentration — the detail institutional LPs expect.", tier: "professional", viz: "Rent Roll Table" },
  { id: "market_positioning", title: "Market Positioning", desc: "Update your investors on how the property compares in its submarket. Rent positioning against comps, competitive advantages, supply pipeline threats, and rent growth trends that affect the thesis.", tier: "professional", viz: "Comparison Table" },
  { id: "capital_improvements", title: "Capital & Improvements Update", desc: "Update your investors on active and completed capital projects. Budget vs. actual tracking, completion status, and projected ROI — only generated when you provide capital project data.", tier: "professional", viz: "Conditional" },
  { id: "risk_watch_items", title: "Risk & Watch Items", desc: "Update your investors on data-driven risk flags before they become problems. Four severity categories with specific mitigation recommendations — the proactive reporting LPs reward with re-ups.", tier: "professional", viz: "Risk Cards" },
  { id: "revenue_summary", title: "Revenue Summary", desc: "Update your investors on top-line revenue including gross potential rent, effective rent, and all other income sources. Budget table format with variance tracking and period-over-period comparison.", tier: "professional", viz: "Budget Table" },
  { id: "expense_summary", title: "Expense Summary", desc: "Update your investors on controllable and non-controllable expenses. Line-by-line budget table showing actual vs. projected with dollar and percentage variance for full transparency.", tier: "professional", viz: "Budget Table" },
  { id: "asset_manager_outlook", title: "Asset Manager Outlook", desc: "Update your investors on what's ahead. A forward-looking narrative covering your 30-60-90 day action plan, key leasing initiatives, staffing updates, and distribution status.", tier: "professional", viz: "Text Only" },
  { id: "investment_thesis_update", title: "Investment Thesis Update", desc: "Update your investors on progress against your original acquisition strategy. Are value-add milestones being met? Track renovation completion, rent lift targets, and stabilization timelines against underwriting.", tier: "institutional" },
  { id: "lease_expiration_rollover", title: "Lease Expiration & Rollover Analysis", desc: "Update your investors on lease maturity risk. A 12-month expiration calendar with revenue-at-risk analysis, rollover assumptions, and renewal probability scores by unit type.", tier: "institutional" },
  { id: "rent_roll_deep_dive", title: "Rent Roll Deep Dive", desc: "Update your investors with institutional-grade rent roll analysis. Distribution histograms, loss-to-lease quantification, unit-level profitability, and floorplan performance data LPs use for due diligence.", tier: "institutional" },
  { id: "budget_vs_actual", title: "Budget vs. Actual", desc: "Update your investors with comprehensive variance analysis. Line-by-line comparison showing favorable and unfavorable variances with dollar amounts, percentages, and AI-generated explanations for material deviations.", tier: "institutional" },
  { id: "market_submarket_analysis", title: "Market & Submarket Analysis", desc: "Update your investors with institutional-grade market intelligence. Comp set analysis, supply pipeline, absorption trends, and submarket rent growth — the context that frames property-level performance.", tier: "institutional" },
  { id: "capital_value_add_tracker", title: "Capital Improvements & Value-Add Tracker", desc: "Update your investors on renovation progress. Unit-by-unit budget vs. spend, completion status, projected vs. actual rent premium, and return on capital deployed at the project level.", tier: "institutional" },
  { id: "risk_matrix", title: "Risk Matrix", desc: "Update your investors with a severity-rated risk assessment across 7 categories. Data-driven scores with specific mitigation strategies — the format institutional allocators require for committee reporting.", tier: "institutional" },
  { id: "resident_ops", title: "Resident & Operational Metrics", desc: "Update your investors on the operational health behind the numbers. Work order velocity, maintenance cost per unit, resident satisfaction trends, and turnover cost analysis.", tier: "institutional" },
  { id: "compliance", title: "Regulatory & Compliance Notes", desc: "Update your investors on regulatory exposure. Fair Housing compliance, insurance status, local ordinance changes, and any pending litigation — the section risk-averse LPs look for first.", tier: "institutional" },
  { id: "strategic_outlook", title: "Asset Manager Strategic Outlook", desc: "Update your investors with a comprehensive strategic narrative. 30-60-90 day action items, hold/sell analysis framework, and investment committee commentary that positions you as a sophisticated operator.", tier: "institutional" },
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

const FAQ_DATA = [
  { q: "How is this different from pasting my T-12 into ChatGPT?", a: "ChatGPT returns a paragraph. WriteUp AI returns a multi-section branded investor report with revenue waterfalls, expense bars, occupancy gauges, KPI cards, your firm's colors, and a PDF that renders identically across browsers." },
  { q: "Will my investors know this was generated by AI?", a: "No. Reports carry your firm's logo, brand colors, and custom disclaimer. No AI watermarks. Every section is reviewed and approved by your team before export." },
  { q: "Does the AI make up numbers?", a: "Never. It parses your uploaded T-12 line by line and extracts exact values. Three-layer math verification catches any deviation. All analysis stops at NOI." },
  { q: "Can I edit the report before sending it?", a: "Every section is independently editable. Change a word, rewrite a paragraph, or regenerate individual sections with custom instructions." },
  { q: "What happens to my data?", a: "Encrypted in transit and at rest. Row-level security. Not shared with other users, not used to train AI models." },
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
function LockIc({ s = 14 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
}
function GripIc() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="5" r="1.5" fill={W.textMuted}/><circle cx="15" cy="5" r="1.5" fill={W.textMuted}/><circle cx="9" cy="11" r="1.5" fill={W.textMuted}/><circle cx="15" cy="11" r="1.5" fill={W.textMuted}/><circle cx="9" cy="17" r="1.5" fill={W.textMuted}/><circle cx="15" cy="17" r="1.5" fill={W.textMuted}/></svg>;
}
function ChevDown({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>;
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
  return <button className="cta-main" onClick={onClick} disabled={disabled} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: full ? "100%" : "auto", padding: m ? "16px 20px" : "16px 36px", minHeight: 54, background: disabled ? W.textMuted : gradient ? `linear-gradient(135deg,${W.accent},${W.accentDark})` : W.accent, color: "#fff", border: "none", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: F.body, fontSize: m ? 15 : 16, fontWeight: 600, opacity: disabled ? 0.6 : 1, WebkitTapHighlightColor: "transparent" }}>{children}</button>;
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return <div style={{ textAlign: "center", marginTop: 10 }}><button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 13, color: W.textMuted, padding: "10px 16px", minHeight: 44 }}>← Back</button></div>;
}

function Modal({ title, children, onClose, m }: { title: string; children: React.ReactNode; onClose: () => void; m?: boolean }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: m ? "flex-end" : "center", justifyContent: "center", zIndex: 200, padding: m ? 0 : 16, backdropFilter: "blur(6px)" }}>
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

function Reveal({ visible, delay = 0, children, style = {} }: { visible: boolean; delay?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.98)", filter: visible ? "blur(0)" : "blur(3px)", transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

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
        <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>{Array.from({ length: 5 }).map((_, i) => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}</div>
        <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textMid, lineHeight: 1.65, margin: "0 0 14px", fontStyle: "italic" }}>&ldquo;{r.content}&rdquo;</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: W.greenBg, border: `1px solid ${W.green}20`, marginBottom: 12 }}><Chk c={W.green} s={12} /><span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.green }}>{r.metric}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.bgAlt, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
          <div><div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>{r.descriptor}</div><div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>{r.details} · {r.timeAgo}</div></div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>{REVIEWS.map((_, i) => <button key={i} onClick={() => { setIdx(i); setPaused(true); }} style={{ width: idx === i ? 20 : 8, height: 8, borderRadius: 100, border: "none", cursor: "pointer", background: idx === i ? W.accent : W.borderL, transition: "all 0.3s", padding: 0 }} />)}</div>
      <div style={{ textAlign: "center", marginTop: 8, fontFamily: F.body, fontSize: 10, color: W.textMuted, fontStyle: "italic" }}>Due to confidentiality, firm names are withheld. These outcomes are real and typical for firms adopting WriteUp AI.</div>
    </div>
  );
}

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
      <div style={{ padding: "6px 8px" }}>{secs.map((s, i) => (<div key={s.id} style={{ padding: "4px 0", borderBottom: i < secs.length - 1 ? `1px solid ${W.borderL}` : "none" }}><div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 2, height: 8, background: p.accent, borderRadius: 1 }} /><span style={{ fontWeight: 600, color: W.text, fontSize: 8 }}>{s.title}</span></div></div>))}</div>
      <div style={{ padding: "4px 8px", borderTop: `1px solid ${W.borderL}`, textAlign: "center", fontSize: 7, color: W.textMuted }}>Est. 8-12 pages</div>
    </div>
  );
}

function makeRevealGradient(c: string) {
  return `linear-gradient(135deg, ${c} 0%, ${c} 30%, #C97B84 36%, #D4A84C 42%, #7ABFBF 48%, #B09ED8 54%, #8DB98D 60%, transparent 66%, transparent 100%)`;
}

function scrollRevealStyle(ratio: number, c: string): React.CSSProperties {
  const pos = 100 - ratio * 100;
  return { background: makeRevealGradient(c), backgroundSize: "350% 350%", backgroundPosition: `${pos}% ${pos}%`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
}

function PrismBorder({ children, featured }: { children: React.ReactNode; featured: boolean }) {
  if (!featured) return <>{children}</>;
  return (
    <div style={{ position: "relative", borderRadius: 22, padding: 2, background: "linear-gradient(135deg, #C97B84, #D4A84C, #7ABFBF, #B09ED8, #8DB98D, #C97B84)", backgroundSize: "300% 300%", animation: "shimmerBorder 4s ease infinite" }}>
      <div style={{ position: "absolute", inset: -8, borderRadius: 30, background: "linear-gradient(135deg, rgba(201,123,132,0.12), rgba(212,168,76,0.12), rgba(122,191,191,0.12), rgba(176,158,216,0.12), rgba(141,185,141,0.12))", backgroundSize: "300% 300%", animation: "shimmerBorder 4s ease infinite", filter: "blur(16px)", zIndex: -1 }} />
      {children}
    </div>
  );
}

function StatCounter({ value, label, suffix = "", visible, delay = 0, color = W.text }: { value: number; label: string; suffix?: string; visible: boolean; delay?: number; color?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      let i = 0;
      const step = Math.max(1, Math.floor(value / 15));
      const iv = setInterval(() => { i += step; if (i >= value) { setCount(value); clearInterval(iv); } else { setCount(i); } }, 40);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [visible, value, delay]);
  return (
    <div style={{ textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: `all 0.5s ease ${delay}s` }}>
      <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 600, color, lineHeight: 1 }}>{count}{suffix}</div>
      <div style={{ fontFamily: F.body, fontSize: 12, color: W.textSoft, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// Global CSS — all keyframes and hover classes
function GlobalCSS() {
  return (
    <style>{`
      @keyframes shimmerBorder{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes floatOrb1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.1)}50%{transform:translate(-10px,-40px) scale(0.95)}75%{transform:translate(-30px,-10px) scale(1.05)}}
      @keyframes floatOrb2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-25px,15px) scale(1.08)}50%{transform:translate(20px,30px) scale(0.92)}75%{transform:translate(15px,-20px) scale(1.02)}}
      @keyframes floatOrb3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,25px) scale(1.1)}66%{transform:translate(-20px,-15px) scale(0.95)}}
      @keyframes breathe{0%,100%{opacity:0.5}50%{opacity:1}}
      @keyframes ringPulse{0%{box-shadow:0 0 0 0 rgba(0,183,219,0.3)}70%{box-shadow:0 0 0 20px rgba(0,183,219,0)}100%{box-shadow:0 0 0 0 rgba(0,183,219,0)}}
      @keyframes dotSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes checkPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
      @keyframes pulseGlow{0%,100%{box-shadow:0 4px 16px rgba(0,183,219,0.2),0 0 0 0 rgba(0,183,219,0)}50%{box-shadow:0 4px 24px rgba(0,183,219,0.4),0 0 0 8px rgba(0,183,219,0.08)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes dotPulse{0%,100%{opacity:0.4;transform:scale(0.85)}50%{opacity:1;transform:scale(1)}}
      @keyframes bounce{0%,100%{transform:translateY(0);opacity:0.5}50%{transform:translateY(6px);opacity:1}}
      @keyframes wiggleDrag{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
      @keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .cta-main{transition:background 0.2s,transform 0.2s;animation:pulseGlow 2.5s ease-in-out infinite}
      .cta-main:active{transform:scale(0.98)}
      .cta-main:disabled{animation:none}
      .plan-card{transition:box-shadow 0.3s,transform 0.3s}
      .faq-btn{transition:all 0.2s}
      .step-card{transition:all 0.25s ease}
      .sec-row{transition:box-shadow 0.25s}
      .info-link{transition:color 0.2s}
      .card-lift{transition:box-shadow 0.25s,transform 0.25s}
      .modal-overlay{animation:fadeUp 0.15s ease-out}
      @media(hover:hover){
        .cta-main:hover:not(:disabled){background:${W.accentDark}!important;transform:translateY(-1px)}
        .plan-card:hover{transform:translateY(-4px)!important}
        .faq-btn:hover{background:${W.bgWarm}!important}
        .step-card:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,0.07)!important;border-color:${W.accent}30!important}
        .sec-row:hover{box-shadow:0 4px 20px rgba(0,0,0,0.05)!important}
        .info-link:hover{color:${W.accentDark}!important}
        .card-lift:hover{box-shadow:0 8px 28px rgba(0,0,0,0.06)!important;transform:translateY(-2px)}
      }
    `}</style>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 1 — The Hook (v5 mockup)
// ═══════════════════════════════════════════════════════════

function Screen1({ onNext, m }: { onNext: () => void; m: boolean }) {
  const [modal, setModal] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);
  const ani = (delay = 0): React.CSSProperties => loaded ? { opacity: 1, transform: "translateY(0)", transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s` } : { opacity: 0, transform: "translateY(16px)" };

  return (
    <div style={{ overflowX: "hidden", minHeight: "calc(100vh - 56px)" }}>
      {/* Hero — white → cream gradient */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 60%, ${W.bgAlt} 100%)`, padding: `0 ${m ? "16px" : "40px"} 0` }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <Dots current={0} total={5} m={m} />

          {/* Eyebrow badge with pulsing dot */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: m ? "8px 18px" : "10px 22px", borderRadius: 100, marginBottom: m ? 16 : 20, background: "linear-gradient(135deg, rgba(0,183,219,0.08), rgba(0,183,219,0.02))", border: "1px solid rgba(0,183,219,0.18)", ...ani(0.05) }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: W.accent, animation: "dotPulse 2s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: F.body, fontSize: m ? 13 : 14, fontWeight: 600, color: W.accentDark, letterSpacing: "0.02em" }}>Your complimentary report starts here</span>
          </div>

          <h1 style={{ fontFamily: F.display, fontSize: m ? 28 : 38, fontWeight: 500, color: W.text, lineHeight: 1.15, margin: "0 0 14px", letterSpacing: "-0.02em", ...ani(0.1) }}>
            Reporting quality is the #1 factor{" "}
            <span style={{ color: W.accent }}>investors use to evaluate your firm</span>
          </h1>

          <p style={{ fontFamily: F.body, fontSize: m ? 14 : 15, color: W.textSoft, lineHeight: 1.65, maxWidth: 520, margin: "0 auto", ...ani(0.15) }}>
            74% of institutional LPs rank it above past performance.{" "}
            <button onClick={() => setModal("research")} className="info-link" style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", textDecoration: "underline", padding: 0 }}>See the research</button>.
            {" "}We built WriteUp AI to give your firm the same reporting standard as the top institutional shops.
          </p>

          {/* Scroll encouragement */}
          <div style={{ marginTop: m ? 24 : 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...ani(0.25) }}>
            <span style={{ fontFamily: F.body, fontSize: m ? 12 : 13, fontWeight: 600, color: W.textMid, letterSpacing: "0.02em" }}>Here&apos;s how it works</span>
            <div style={{ animation: "bounce 2s ease-in-out infinite", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg width={m ? 24 : 28} height={m ? 24 : 28} viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 14 18 9" /></svg>
              <svg width={m ? 24 : 28} height={m ? 24 : 28} viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: m ? -10 : -12, opacity: 0.4 }}><polyline points="6 9 12 14 18 9" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Steps + Comparison + CTA — warm flow */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bgAlt} 0%, ${W.bgAlt} 55%, ${W.bg} 85%)`, padding: `${m ? 32 : 44}px ${m ? "16px" : "40px"} ${m ? 36 : 48}px` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {/* Step cards — vertical stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: m ? 12 : 16 }}>
            {[
              { num: "1", time: "30 sec", title: "Set up your property", desc: "Name, address, unit count. Choose your brand colors from six professional presets or enter your exact brand hex.", link: "See branding options", mKey: "step1", iconD: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
              { num: "2", time: "3 min", title: "Upload your T-12 & answer a few questions", desc: "Drop in your PDF, Excel, or CSV. We extract every line item automatically. Add optional context — move-ins, financial changes, asset manager notes.", link: "What is a T-12?", mKey: "step2", iconD: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
              { num: "3", time: "~90 sec", title: "Our engine analyzes & verifies every number", desc: "Three-layer math verification: input tracing, formula validation, arithmetic re-computation. Every value tied to source. Zero hallucinations.", link: "How math verification works", mKey: "math", iconD: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
            ].map((s, i) => (
              <div key={i} className="step-card" style={{ display: "flex", gap: m ? 12 : 18, alignItems: "center", background: W.bg, borderRadius: m ? 12 : 14, padding: m ? "16px 14px" : "22px 24px", border: `1px solid ${W.borderL}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative", ...ani(0.05 + i * 0.08) }}>
                <span style={{ position: "absolute", top: m ? 14 : 20, right: m ? 12 : 20, fontFamily: F.body, fontSize: m ? 9 : 10, fontWeight: 600, color: W.textMuted, background: W.bgAlt, padding: m ? "2px 6px" : "3px 8px", borderRadius: 5, border: `1px solid ${W.borderL}`, whiteSpace: "nowrap" as const }}>{s.time}</span>
                <div style={{ width: m ? 42 : 52, height: m ? 42 : 52, borderRadius: m ? 12 : 14, flexShrink: 0, background: `${W.accent}06`, border: `1.5px solid ${W.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: F.display, fontSize: m ? 18 : 22, fontWeight: 600, color: W.accent, lineHeight: 1 }}>{s.num}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: m ? 40 : 56 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: m ? 6 : 8, marginBottom: 6 }}>
                    {!m && <Ic d={s.iconD} c={W.accent} s={18} />}
                    <h3 style={{ fontFamily: F.body, fontSize: m ? 14 : 15, fontWeight: 700, color: W.text, margin: 0, lineHeight: 1.3 }}>{s.title}</h3>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: m ? 12 : 13, color: W.textSoft, lineHeight: 1.6, margin: "0 0 8px" }}>{s.desc}</p>
                  <button onClick={() => setModal(s.mKey)} className="info-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.accent, padding: 0, textDecoration: "underline", minHeight: 32 }}>{s.link}</button>
                </div>
              </div>
            ))}
          </div>

          {/* Speed comparison */}
          <div style={{ marginTop: m ? 24 : 40, padding: m ? "18px 14px" : "28px 36px", borderRadius: m ? 12 : 14, border: `1px solid ${W.border}`, background: W.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", justifyContent: "center", gap: m ? 12 : 36 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: m ? 9 : 10, fontWeight: 600, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>Manual</div>
              <div style={{ fontFamily: F.display, fontSize: m ? 20 : 30, fontWeight: 600, color: W.red, lineHeight: 1, textDecoration: "line-through", textDecorationColor: `${W.red}40` }}>6-8 hrs</div>
              <div style={{ fontFamily: F.body, fontSize: m ? 10 : 11, color: W.textMuted, marginTop: 4 }}>per property, no verification</div>
            </div>
            <svg width={m ? 16 : 20} height={m ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: m ? 9 : 10, fontWeight: 600, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 3 }}>WriteUp AI</div>
              <div style={{ fontFamily: F.display, fontSize: m ? 20 : 30, fontWeight: 600, color: W.accent, lineHeight: 1 }}>Under 5 min</div>
              <div style={{ fontFamily: F.body, fontSize: m ? 10 : 11, color: W.textSoft, marginTop: 4 }}>math verified, branded</div>
            </div>
          </div>

          {/* Platform teaser + security */}
          <div style={{ textAlign: "center", marginTop: m ? 28 : 40 }}>
            <p style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textMid, lineHeight: 1.6, margin: "0 0 6px" }}>
              WriteUp AI is a complete reporting platform — not a one-off generator.{" "}
              <button onClick={() => setModal("platform")} className="info-link" style={{ background: "none", border: "none", cursor: "pointer", color: W.accent, fontWeight: 600, fontFamily: F.body, fontSize: "inherit", padding: 0, textDecoration: "underline" }}>Explore your reporting platform</button>
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: m ? 6 : 16, marginTop: 12, marginBottom: m ? 20 : 28, flexWrap: "wrap" as const, flexDirection: m ? "column" : "row" }}>
              {["SOC 2 architecture", "End-to-end encryption", "Row-level data isolation"].map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.textMuted} s={11} />
                  <span style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: m ? "100%" : 420, margin: "0 auto" }}>
            <Btn onClick={onNext} m={m}>Show Me What My Report Includes <Arr /></Btn>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "research" && <Modal title="The Research Behind WriteUp AI" onClose={() => setModal(null)} m={m}><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}><ModalRow icon="M12 20V10M18 20V4M6 20v-4" title="74% of institutional LPs" desc="rank reporting quality as their #1 criterion when selecting a fund manager — above past performance." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" title="92% investor retention" desc="Origin Investments directly attributes this to the quality of its quarterly reporting." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1" title="Real cost of bad reports" desc="Lost trust, failed re-ups, and slower fundraising. Firms that treat reporting as a competitive advantage consistently outperform on capital retention." /><p style={{ marginTop: 12 }}>WriteUp AI was built to give every multifamily PE firm the same reporting standard the top institutional shops use.</p></div></Modal>}
      {modal === "step1" && <Modal title="Property Setup" onClose={() => setModal(null)} m={m}><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}><p style={{ marginBottom: 12 }}>For your complimentary report, we just need the basics. As a subscriber:</p><ModalRow icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" iconColor={W.green} iconBg={W.greenBg} title="Investment Strategy" desc="Define your value-add thesis once. Every report tracks performance against it." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" iconColor={W.green} iconBg={W.greenBg} title="Budget Upload" desc="Upload once per year. Every report includes automatic budget vs. actual variance." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" iconColor={W.green} iconBg={W.greenBg} title="One-Click Monthly" desc="Settings persist. Next month: upload T-12, click Generate. Done." /></div></Modal>}
      {modal === "step2" && <Modal title="Data Extraction & Guided Questions" onClose={() => setModal(null)} m={m}><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}><ModalRow icon="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" title="Source Data Registry" desc="We parse your T-12 and build a canonical set of verified values — the single source of truth for every section." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" title="PDF, Excel, or CSV" desc="Drop in whatever format you have. Revenue and expense line items extracted automatically." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" title="Dynamic Questionnaire" desc="Questions adapt to your enabled sections. Disable Capital Improvements — the related question disappears." /></div></Modal>}
      {modal === "math" && <Modal title="Three-Layer Math Verification" onClose={() => setModal(null)} m={m}><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}><p style={{ marginBottom: 12 }}>Every calculation is independently verified. <strong>Zero AI hallucinations. Zero financial errors. Guaranteed.</strong></p><ModalRow icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" iconColor={W.green} iconBg={W.greenBg} title="Layer 1 — Input Verification" desc="Every value traced back to your source T-12. Mismatches corrected automatically." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" iconColor={W.green} iconBg={W.greenBg} title="Layer 2 — Formula Verification" desc="15+ registered formulas checked — NOI, EGI, DSCR, expense ratio, per-unit metrics." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M12 20V10M18 20V4M6 20v-4" iconColor={W.green} iconBg={W.greenBg} title="Layer 3 — Arithmetic Verification" desc="Every formula re-computed by deterministic math engine. Overrides any AI deviation." /><div style={{ padding: "12px 14px", borderRadius: 10, background: W.greenBg, border: `1px solid ${W.green}20`, marginTop: 12 }}><div style={{ fontWeight: 600, color: W.green, marginBottom: 3 }}>Full Audit Trail</div><div style={{ color: W.textMid, fontSize: 12 }}>Expand any section to see every correction — original value, corrected value, confidence level.</div></div><p style={{ marginTop: 10, fontStyle: "italic", color: W.textSoft, fontSize: 12 }}>This verification is proprietary to WriteUp AI. Not available in any general-purpose AI tool.</p></div></Modal>}
      {modal === "platform" && <Modal title="Your Reporting Platform" onClose={() => setModal(null)} m={m}><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.7 }}><div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", padding: "4px 0", WebkitOverflowScrolling: "touch" as never }}>{["Draft", "In Review", "Final Review", "Ready to Send", "Delivered"].map((stage, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}><div style={{ padding: "5px 10px", borderRadius: 8, background: i === 4 ? W.greenBg : i === 3 ? W.goldBg : `${W.accent}08`, border: `1px solid ${i === 4 ? W.green : i === 3 ? W.gold : W.accent}20`, fontSize: 10, fontWeight: 600, color: i === 4 ? W.green : i === 3 ? W.gold : W.accent, whiteSpace: "nowrap" as const }}>{stage}</div>{i < 4 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}</div>))}</div><ModalRow icon="M13 10V3L4 14h7v7l9-11h-7z" title="Generate" desc="Upload T-12, answer questions, get a report in under 2 minutes." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" title="Review & Edit" desc="Edit inline. Regenerate with instructions. Control paragraph length." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" title="Collaborate" desc="Team roles. Analysts draft, managers review, partners approve." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" title="Brand & Configure" desc="Logo, colors, disclaimers, section order. Set once, generate consistently." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" title="Export & Deliver" desc="PDF, HTML, or rich email-ready. 'View Full Report' for investors — no login required." /><div style={{ borderBottom: `1px solid ${W.borderL}` }} /><ModalRow icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" title="Archive" desc="Reports stored chronologically. Full history by property, every month." /></div></Modal>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 2 — Sections (redesign mockup)
// ═══════════════════════════════════════════════════════════

function SectionRow({ title, desc, viz, included, locked, planTag, expanded, onToggle, m, draggable: isDraggable, onDragStart, onDragOver, onDragEnd, isDragging }: {
  title: string; desc: string; viz?: string; included?: boolean; locked?: boolean; planTag?: string;
  expanded: boolean; onToggle: () => void; m: boolean;
  draggable?: boolean; onDragStart?: () => void; onDragOver?: (e: React.DragEvent) => void; onDragEnd?: () => void; isDragging?: boolean;
}) {
  return (
    <div className="sec-row" draggable={isDraggable} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} style={{ background: W.bg, borderRadius: 14, overflow: "hidden", boxShadow: locked ? "none" : "0 2px 10px rgba(0,0,0,0.04)", border: locked ? `1px solid ${W.borderL}` : "none", cursor: isDraggable ? "grab" : "default", opacity: isDragging ? 0.6 : 1 }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: m ? 10 : 14, padding: m ? "13px 14px" : "15px 20px", cursor: "pointer" }}>
        {included && <GripIc />}
        {locked && <LockIc s={14} />}
        {included && <Chk c={W.green} s={16} />}
        <span style={{ fontFamily: F.body, fontSize: m ? 14 : 15, fontWeight: 600, color: locked ? W.textMid : W.text, flex: 1 }}>{title}</span>
        {viz && !m && <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, color: included ? W.accent : W.textMuted, background: included ? `${W.accent}08` : W.bgAlt, padding: "3px 8px", borderRadius: 5, border: `1px solid ${included ? `${W.accent}15` : W.borderL}` }}>{viz}</span>}
        {planTag && <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: planTag === "PRO" ? W.accent : W.navy, background: planTag === "PRO" ? `${W.accent}08` : `${W.navy}08`, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em", border: `1px solid ${planTag === "PRO" ? `${W.accent}15` : `${W.navy}15`}` }}>{planTag}</span>}
        {included && <span style={{ fontFamily: F.body, fontSize: 8, fontWeight: 700, color: W.green, background: W.greenBg, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" as const, border: `1px solid ${W.green}20` }}>Included</span>}
        <ChevDown open={expanded} />
      </div>
      {expanded && <div style={{ padding: `0 ${m ? 14 : 20}px 16px ${included ? (m ? 42 : 54) : (m ? 38 : 48)}px`, fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.65, borderTop: `1px solid ${W.borderL}`, paddingTop: 14 }}>{desc}</div>}
    </div>
  );
}

function Screen2({ onNext, onBack, m }: { onNext: () => void; onBack: () => void; m: boolean }) {
  const freeSecs = ALL_SECTIONS.filter(s => FREE_IDS.includes(s.id));
  const [sections, setSections] = useState(freeSecs);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const pro = ALL_SECTIONS.filter(s => s.tier === "professional" && !FREE_IDS.includes(s.id));
  const inst = ALL_SECTIONS.filter(s => s.tier === "institutional");

  const toggle = (id: string) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };
  const onDS = (i: number) => setDragIdx(i);
  const onDO = (e: React.DragEvent, i: number) => { e.preventDefault(); if (dragIdx === null || dragIdx === i) return; const n = [...sections]; const [mv] = n.splice(dragIdx, 1); n.splice(i, 0, mv); setSections(n); setDragIdx(i); };
  const onDE = () => setDragIdx(null);

  return (
    <div style={{ overflowX: "hidden", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 10%, ${W.bgAlt} 55%, ${W.bg} 85%)`, padding: `0 ${m ? "16px" : "40px"} ${m ? 36 : 56}px` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Dots current={1} total={5} m={m} />
          <div style={{ textAlign: "center", marginBottom: m ? 20 : 32 }}>
            <h2 style={{ fontFamily: F.display, fontSize: m ? 26 : 34, fontWeight: 500, color: W.text, margin: "0 0 10px" }}>Choose your report sections</h2>
            <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textSoft, lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>Your complimentary report includes 5 professional sections. Tap any section to see what your investors receive. Drag to reorder.</p>
          </div>

          {/* Drag hint */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: m ? 20 : 28, padding: "12px 20px", borderRadius: 12, background: W.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ animation: "wiggleDrag 1.5s ease-in-out infinite" }}><GripIc /></div>
            <span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid }}><strong style={{ color: W.text }}>Drag to reorder.</strong> As a subscriber, you also control paragraph length and disclaimers.</span>
          </div>

          {/* Included sections */}
          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.gold, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 10 }}>Generating for your report</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
            {sections.map((s, i) => (
              <SectionRow key={s.id} title={s.title} desc={s.desc} viz={s.viz} included expanded={expanded.has(s.id)} onToggle={() => toggle(s.id)} m={m} draggable onDragStart={() => onDS(i)} onDragOver={(e) => onDO(e, i)} onDragEnd={onDE} isDragging={dragIdx === i} />
            ))}
          </div>

          {/* Professional */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.textMid, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Available in the Professional plan</div>
            <button className="info-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, padding: 0 }}>Explore</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 36, padding: "12px 0", borderRadius: 16, background: `linear-gradient(135deg, ${W.bgAlt}, ${W.bgWarm})`, border: `1px dashed ${W.border}` }}>
            {pro.map(s => <div key={s.id} style={{ padding: "0 12px" }}><SectionRow title={s.title} desc={s.desc} viz={s.viz} locked planTag="PRO" expanded={expanded.has(s.id)} onToggle={() => toggle(s.id)} m={m} /></div>)}
          </div>

          {/* Institutional */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.navy, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Available in the Institutional plan</div>
            <button className="info-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, padding: 0 }}>Explore</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 40, padding: "12px 0", borderRadius: 16, background: `linear-gradient(135deg, ${W.navyBg}, ${W.bgWarm})`, border: `1px dashed ${W.navy}18` }}>
            {inst.map(s => <div key={s.id} style={{ padding: "0 12px" }}><SectionRow title={s.title} desc={s.desc} locked planTag="INST" expanded={expanded.has(s.id)} onToggle={() => toggle(s.id)} m={m} /></div>)}
          </div>

          <Btn onClick={onNext} m={m}>Next: Set Up Your Property <Arr /></Btn>
          <BackBtn onClick={onBack} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 3 — Upload + Brand
// ═══════════════════════════════════════════════════════════

function Screen3({ onNext, onBack, m, formData, setFormData }: {
  onNext: () => void; onBack: () => void; m: boolean;
  formData: FormState; setFormData: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const t12Ref = useRef<HTMLInputElement>(null);
  const rrRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const handleT12 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, t12File: f })); };
  const handleRR = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, rentRollFile: f })); };
  const handleBudget = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, budgetFile: f })); };
  const canProceed = formData.propertyName.trim() && formData.unitCount.trim() && formData.t12File;

  return (
    <div style={{ overflowX: "hidden", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 15%, ${W.bgAlt} 60%, ${W.bg} 90%)`, padding: `${m ? "24px 16px" : "32px 40px"}`, maxWidth: 820, margin: "0 auto" }}>
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
                  <input value={formData[f.k] as string} onChange={e => setFormData(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k === "unitCount" ? "number" : "text"} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.bg, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, minHeight: 44 }} />
                </div>
              ))}
            </div>

            {/* Brand colors */}
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

            {/* T-12 upload */}
            <input ref={t12Ref} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleT12} style={{ display: "none" }} />
            <div onClick={() => t12Ref.current?.click()} style={{ border: `2px dashed ${formData.t12File ? W.green : W.accent}40`, borderRadius: 12, padding: m ? 20 : 28, textAlign: "center", background: formData.t12File ? W.greenBg : `${W.accent}03`, cursor: "pointer", marginBottom: 8 }}>
              {formData.t12File ? <><Chk c={W.green} s={24} /><div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green, marginTop: 6 }}>{formData.t12File.name}</div><div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginTop: 2 }}>Click to replace</div></> : <><div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.text }}>Upload T-12 <span style={{ color: W.red }}>*</span></div><div style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted, marginTop: 4 }}>PDF, Excel, or CSV</div></>}
            </div>

            {/* Rent roll upload */}
            <input ref={rrRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleRR} style={{ display: "none" }} />
            <div onClick={() => rrRef.current?.click()} style={{ border: `1px dashed ${formData.rentRollFile ? W.green : W.border}`, borderRadius: 10, padding: 14, textAlign: "center", background: formData.rentRollFile ? W.greenBg : W.bgWarm, marginBottom: 8, cursor: "pointer", minHeight: 44 }}>
              {formData.rentRollFile ? <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>{formData.rentRollFile.name}</span> : <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.textMid }}>Rent Roll <span style={{ fontWeight: 400, color: W.textMuted }}>(optional)</span></span>}
            </div>

            {/* Budget upload */}
            <input ref={budgetRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleBudget} style={{ display: "none" }} />
            <div onClick={() => budgetRef.current?.click()} style={{ border: `1px dashed ${formData.budgetFile ? W.green : W.border}`, borderRadius: 10, padding: 14, textAlign: "center", background: formData.budgetFile ? W.greenBg : W.bgWarm, marginBottom: 12, cursor: "pointer", minHeight: 44 }}>
              {formData.budgetFile ? <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>{formData.budgetFile.name}</span> : <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.textMid }}>Annual Budget <span style={{ fontWeight: 400, color: W.textMuted }}>(optional — enables variance analysis)</span></span>}
            </div>
          </div>

          {/* Live preview — desktop only */}
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
    </div>
  );
}


// GeneratingPage is now imported from ./generating-page.tsx

// ═══════════════════════════════════════════════════════════
// SCREEN 5 — Delivered (mockup redesign)
// ═══════════════════════════════════════════════════════════

function Screen5ReportPreview({ m, visible }: { m: boolean; visible: boolean }) {
  const sections = ["Executive Summary", "Occupancy & Leasing", "Revenue Analysis", "Expense Analysis", "Net Operating Income"];
  return (
    <div style={{ background: W.bg, borderRadius: 14, border: `1px solid ${W.borderL}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden", opacity: visible ? 1 : 0, transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)", transition: "all 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s" }}>
      <div style={{ background: "#1B2A4A", padding: m ? "12px 16px" : "16px 20px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontFamily: F.display, fontSize: m ? 14 : 16, fontWeight: 600 }}>The Heights at Montrose</div><div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.6, marginTop: 2 }}>March 2026 — Monthly Asset Report</div></div>
          <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.15)" }}>PREVIEW</div>
        </div>
      </div>
      <div style={{ height: 3, background: "#C8A951" }} />
      <div style={{ display: "flex", padding: "10px 12px", background: W.bgWarm }}>
        {[{ k: "NOI", v: "$113.8K", d: "+4.4%" }, { k: "Revenue", v: "$277.8K", d: "+2.5%" }, { k: "Expenses", v: "$164.0K", d: "+1.8%" }, { k: "Occupancy", v: "91.4%", d: "-0.6%" }].map((kpi, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 3 ? `1px solid ${W.borderL}` : "none" }}>
            <div style={{ fontFamily: F.body, fontSize: 8, color: W.textMuted, textTransform: "uppercase" as const }}>{kpi.k}</div>
            <div style={{ fontFamily: F.display, fontSize: m ? 13 : 15, fontWeight: 700, color: "#1B2A4A" }}>{kpi.v}</div>
            <div style={{ fontFamily: F.body, fontSize: 9, color: kpi.d.startsWith("-") ? W.red : W.green, fontWeight: 600 }}>{kpi.d}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px" }}>
        {sections.map((s, i) => (
          <div key={i} style={{ padding: "6px 0", borderBottom: i < sections.length - 1 ? `1px solid ${W.borderL}` : "none", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 3, height: 12, borderRadius: 1, background: "#C8A951" }} /><span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.text }}>{s}</span><span style={{ marginLeft: "auto" }}><Chk c={W.green} s={10} /></span>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${W.borderL}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: F.body, fontSize: 9, color: W.textMuted }}>Est. 8 pages</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.green} s={10} /><span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 600, color: W.green }}>Verified</span></div>
      </div>
    </div>
  );
}

function Screen5EmailPreview({ m }: { m: boolean }) {
  return (
    <div style={{ background: W.bg, borderRadius: 12, border: `1px solid ${W.borderL}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${W.borderL}`, background: W.bgWarm }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: "#fff" }}>WC</span></div>
          <div><div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.text }}>Walker Capital Group</div><div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted }}>reports@walkercapital.com</div></div>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>The Heights at Montrose — March 2026 Asset Report</div>
      </div>
      <div style={{ padding: "14px" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid, lineHeight: 1.6, marginBottom: 12 }}>Dear Limited Partners,<br /><br />Attached is the March 2026 monthly asset report for The Heights at Montrose. Key highlights include NOI of $113.8K (+4.4% MoM), occupancy at 91.4%, and revenue growth of 2.5%.</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, background: "#1B2A4A", color: "#fff", fontFamily: F.body, fontSize: 12, fontWeight: 600 }}>View Full Report <Arr c="#fff" /></div>
        <div style={{ fontFamily: F.body, fontSize: 10, color: W.textMuted, marginTop: 10 }}>No login required. Opens in your browser.</div>
      </div>
    </div>
  );
}

function Screen5({ userEmail, reportId, onBookDemo, m, formData }: {
  userEmail: string; reportId: string | null; onBookDemo: () => void; m: boolean; formData: FormState;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(userEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [statsVis, setStatsVis] = useState(false);
  const [refNext, visNext] = useInView(0.1);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); setTimeout(() => setStatsVis(true), 600); }, []);

  const handleSendAndView = async () => {
    if (!email || !reportId) return;
    setSending(true);
    try {
      const res = await fetch("/api/free-report/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, reportId }) });
      const data = await res.json().catch(() => ({}));
      setSent(true);
      setTimeout(() => { fetch("/api/free-report/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId, email, propertyName: data.propertyName || formData.propertyName || "your property", emailNumber: 1 }) }).catch(() => {}); }, 120_000);
      setTimeout(() => { router.push(`/report/${reportId}`); }, 1500);
    } catch (err) { console.error("Send failed:", err); setSending(false); }
  };

  return (
    <div style={{ overflowX: "hidden", minHeight: "calc(100vh - 56px)" }}>
      {/* Sticky ready banner */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: W.greenBg, borderBottom: `1px solid ${W.green}18`, padding: m ? "10px 16px" : "12px 24px", display: "flex", flexDirection: m ? "column" : "row", alignItems: "center", gap: m ? 10 : 16, animation: "slideDown 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: `1px solid ${W.green}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "checkPop 0.4s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}><Chk c={W.green} s={18} /></div>
          <div><div style={{ fontFamily: F.body, fontSize: m ? 14 : 15, fontWeight: 700, color: W.green }}>Your report is ready</div><div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid }}>5 sections verified. 0 errors. Institutional quality.</div></div>
        </div>
        <button onClick={() => reportId && router.push(`/report/${reportId}`)} style={{ padding: "11px 22px", borderRadius: 10, border: "none", cursor: "pointer", background: W.green, color: "#fff", fontFamily: F.body, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" as const, width: m ? "100%" : "auto", justifyContent: "center", minHeight: 44, boxShadow: `0 2px 10px ${W.green}25` }}>View Report <Arr /></button>
      </div>

      {/* Celebration + Stats + Previews */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 20%, ${W.bgAlt} 60%, ${W.bg} 85%)`, padding: `${m ? 28 : 48}px ${m ? "16px" : "40px"} ${m ? 36 : 56}px` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Dots current={4} total={5} m={m} />

          <Reveal visible={loaded} delay={0}>
            <div style={{ textAlign: "center", marginBottom: m ? 24 : 36 }}>
              <h2 style={{ fontFamily: F.display, fontSize: m ? 28 : 38, fontWeight: 500, color: W.text, margin: "0 0 10px" }}>Your report is <span style={{ color: W.green }}>ready to send</span></h2>
              <p style={{ fontFamily: F.body, fontSize: m ? 14 : 16, color: W.textSoft, lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>Five institutional-quality sections, math verified, branded to your firm. Enter your email and two things happen:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440, margin: "14px auto 0", textAlign: "left" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: `${W.accent}10`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: W.accent }}>1</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5, margin: 0 }}>We&apos;ll <strong style={{ color: W.text }}>email you</strong> the same investor-ready export your LPs would receive — branded summary with a &ldquo;View Full Report&rdquo; link.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: `${W.green}10`, border: `1px solid ${W.green}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: W.green }}>2</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5, margin: 0 }}>You&apos;ll <strong style={{ color: W.text }}>see the full report</strong> on the next page — every section, chart, and the complete math verification audit trail, exactly as it appears in the platform.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal visible={loaded} delay={0.15}>
            <div style={{ display: "flex", justifyContent: "center", gap: m ? 20 : 40, padding: m ? "20px 0" : "28px 0", marginBottom: m ? 20 : 32 }}>
              <StatCounter value={5} label="Sections" visible={statsVis} delay={0} color={W.accent} />
              <div style={{ width: 1, background: W.borderL }} />
              <StatCounter value={8} label="Est. Pages" visible={statsVis} delay={0.1} color={W.text} />
              <div style={{ width: 1, background: W.borderL }} />
              <StatCounter value={100} suffix="%" label="Math Verified" visible={statsVis} delay={0.2} color={W.green} />
              <div style={{ width: 1, background: W.borderL }} />
              <StatCounter value={0} label="Errors Found" visible={statsVis} delay={0.3} color={W.green} />
            </div>
          </Reveal>

          {/* Side-by-side previews */}
          <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 16 : 20, marginBottom: m ? 28 : 40 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>What you&apos;ll see next</div>
              <Screen5ReportPreview m={m} visible={loaded} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: W.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>What arrives in your inbox</div>
              <Reveal visible={loaded} delay={0.4}><Screen5EmailPreview m={m} /></Reveal>
            </div>
          </div>

          {/* Email delivery */}
          <Reveal visible={loaded} delay={0.5}>
            <div style={{ background: W.bg, borderRadius: 16, padding: m ? 20 : 28, boxShadow: "0 2px 16px rgba(0,0,0,0.04)", marginBottom: m ? 8 : 12 }}>
              <div style={{ fontFamily: F.display, fontSize: m ? 20 : 24, fontWeight: 500, color: W.text, marginBottom: 4 }}>Deliver your report</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, marginBottom: 16, lineHeight: 1.5 }}>We&apos;ll email you a branded investor-ready export — the exact same format your LPs would receive. Then you&apos;ll see the full report with math verification on the next page.</p>
              <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: 8 }}>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: `1px solid ${W.borderL}`, fontFamily: F.body, fontSize: 16, color: W.text, outline: "none", boxSizing: "border-box" as const, background: W.bgWarm }} />
                <button className="cta-main" onClick={handleSendAndView} disabled={sending || sent || !reportId} style={{ padding: "14px 28px", background: sent ? W.green : W.accent, color: "#fff", border: "none", borderRadius: 12, cursor: sending || sent ? "default" : "pointer", fontFamily: F.body, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" as const, minHeight: 52, width: m ? "100%" : "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {sent ? <><Chk c="#fff" s={16} /> Sent</> : sending ? "Sending..." : <>Send & View Report <Arr /></>}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontFamily: F.body, fontSize: 11, color: W.textMuted }}><Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.textMuted} s={11} />Your email and report link are private. You&apos;ll be redirected to the full report automatically.</div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* What happens next */}
      <div ref={refNext} style={{ background: W.bg, padding: `${m ? 36 : 56}px ${m ? "16px" : "40px"} ${m ? 44 : 72}px` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Reveal visible={visNext} delay={0}>
            <div style={{ textAlign: "center", marginBottom: m ? 24 : 36 }}>
              <h3 style={{ fontFamily: F.display, fontSize: m ? 24 : 32, fontWeight: 500, color: W.text, margin: "0 0 8px" }}>What happens next</h3>
              <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textSoft, lineHeight: 1.6 }}>This was one report for one property. Imagine this across your entire portfolio — every month, on time, consistent.</p>
            </div>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: m ? 28 : 40 }}>
            <Reveal visible={visNext} delay={0.1}>
              <div className="card-lift" onClick={() => router.push("/dashboard/pricing")} style={{ display: "flex", gap: m ? 14 : 18, padding: m ? 18 : 24, background: `${W.accent}04`, borderRadius: 16, border: `1.5px solid ${W.accent}20`, cursor: "pointer", alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${W.accent}10`, border: `1px solid ${W.accent}20`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d="M5 12h14M12 5l7 7-7 7" c={W.accent} s={22} /></div>
                <div style={{ flex: 1 }}><div style={{ fontFamily: F.body, fontSize: m ? 16 : 17, fontWeight: 700, color: W.accent, marginBottom: 2 }}>Choose a plan and start reporting</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>Immediate access. Generate reports for your entire portfolio. Starting at $75/property/month.</div></div>
                <Arr c={W.accent} />
              </div>
            </Reveal>
            <Reveal visible={visNext} delay={0.2}>
              <div className="card-lift" onClick={onBookDemo} style={{ display: "flex", gap: m ? 14 : 18, padding: m ? 18 : 24, background: W.bg, borderRadius: 16, border: `1px solid ${W.borderL}`, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", cursor: "pointer", alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: W.navyBg, border: `1px solid ${W.navy}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" c={W.navy} s={22} /></div>
                <div style={{ flex: 1 }}><div style={{ fontFamily: F.body, fontSize: m ? 16 : 17, fontWeight: 700, color: W.navy, marginBottom: 2 }}>Book a 25-minute demo</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>We generate a report from your actual T-12 — live on the call. Bring a T-12, leave with a report you can send the same day.</div></div>
                <Arr c={W.navy} />
              </div>
            </Reveal>
            <Reveal visible={visNext} delay={0.3}>
              <div className="card-lift" onClick={handleSendAndView} style={{ display: "flex", gap: m ? 14 : 18, padding: m ? 18 : 24, background: W.bg, borderRadius: 16, border: `1px solid ${W.borderL}`, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", cursor: "pointer", alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: W.bgAlt, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" c={W.textMid} s={22} /></div>
                <div style={{ flex: 1 }}><div style={{ fontFamily: F.body, fontSize: m ? 16 : 17, fontWeight: 700, color: W.text, marginBottom: 2 }}>Just send me the report</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>Not ready to commit? No problem. We&apos;ll deliver your free report and follow up with tips.</div></div>
                <Arr c={W.textMuted} />
              </div>
            </Reveal>
          </div>

          {/* Demo value prop */}
          <Reveal visible={visNext} delay={0.4}>
            <div style={{ padding: m ? 20 : 28, borderRadius: 18, background: `linear-gradient(135deg, ${W.navyBg}, ${W.bgWarm})`, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${W.navy}08`, border: `1px solid ${W.navy}12`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" c={W.navy} s={18} /></div>
                <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: W.navy }}>What happens on the demo</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 12 }}>
                {[
                  { time: "0-5 min", text: "We review your complimentary report together. You see exactly how we parsed your T-12." },
                  { time: "5-15 min", text: "Live report generation from a second property. You watch the Report Designer, section builder, and math verification in real time." },
                  { time: "15-20 min", text: "Team workflows, approval pipeline, and email delivery. How your firm would use this monthly." },
                  { time: "20-25 min", text: "Your questions. Pricing. Onboarding timeline. You leave with a second report you can send today." },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: W.navy, background: `${W.navy}08`, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" as const, height: "fit-content", marginTop: 2 }}>{step.time}</div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>{step.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal visible={visNext} delay={0.5}>
            <div style={{ textAlign: "center", marginTop: m ? 28 : 40 }}><p style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted, lineHeight: 1.6 }}>Questions? Reply to your report delivery email and a human will respond within 2 hours.</p></div>
          </Reveal>
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
  budgetFile: File | null;
}

// ═══════════════════════════════════════════════════════════
// DEMO BOOKING MODAL
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
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: W.bgAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

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
                    {leadSent ? <div style={{ textAlign: "center" }}><Chk c={W.green} s={16} /><span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green, marginLeft: 6 }}>We&apos;ll be in touch</span></div> : (
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
            {budgetFit !== "no" && <button onClick={() => setDemoStep(1)} disabled={!canGo} style={{ width: "100%", padding: "14px 24px", borderRadius: 12, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? W.accent : W.textMuted, color: "#fff", fontFamily: F.body, fontSize: 15, fontWeight: 600, boxShadow: canGo ? `0 4px 16px ${W.accent}30` : "none", opacity: canGo ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 }}>See Available Times <Arr /></button>}
          </div>
        )}

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
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${W.borderL}`, minHeight: m ? 480 : 500 }}><iframe src={calendlyUrl} style={{ width: "100%", minHeight: m ? 520 : 580, border: "none" }} title="Book a demo" /></div>
            <div style={{ textAlign: "center", marginTop: 10 }}><button onClick={() => setDemoStep(0)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 12, color: W.textMuted, minHeight: 44, padding: "10px 16px" }}>← Back to questions</button></div>
          </div>
        )}

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
  const { m } = useResponsive();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    propertyName: "", unitCount: "", address: "", companyName: "",
    preset: 0, customColor: "", t12File: null, rentRollFile: null, budgetFile: null,
  });

  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string | number>>({});

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

      // Extract report period and distribution from answers
      const { distribution, reportMonth, reportYear, ...questionnaireFields } = questionAnswers;

      // Pass report period — defaults to previous month if not set
      const now = new Date();
      const defMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const defYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      fd.append("reportMonth", String(reportMonth || defMonth));
      fd.append("reportYear", String(reportYear || defYear));

      const cleanedQuestionnaire: Record<string, string> = {};
      for (const [key, value] of Object.entries(questionnaireFields)) {
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          cleanedQuestionnaire[key] = String(value);
        }
      }
      if (distribution && String(distribution).trim()) {
        cleanedQuestionnaire.distribution_status = String(distribution);
      }
      fd.append("questionnaire", JSON.stringify(cleanedQuestionnaire));

      if (formData.t12File) fd.append("t12", formData.t12File);
      if (formData.rentRollFile) fd.append("rentRoll", formData.rentRollFile);
      if (formData.budgetFile) fd.append("budget", formData.budgetFile);

      const setupRes = await fetch("/api/free-report/generate", { method: "POST", body: fd });
      if (!setupRes.ok) {
        const d = await setupRes.json().catch(() => ({}));
        throw new Error(d.error || "Failed to set up report");
      }
      const setupData = await setupRes.json();
      setReportId(setupData.reportId);

      const distStatus = String(distribution || setupData.questionnaire?.distribution_status || "");
      const { distribution_status: _ds, ...qaForGeneration } = setupData.questionnaire || {};

      const genRes = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: setupData.reportId,
          propertyId: setupData.propertyId,
          selectedMonth: setupData.selectedMonth,
          selectedYear: setupData.selectedYear,
          tier: setupData.tier,
          sectionIds: FREE_IDS,
          distributionStatus: distStatus,
          distributionNote: "",
          questionnaireAnswers: qaForGeneration,
          streaming: true,
        }),
      });

      if (!genRes.ok) {
        console.error("[FREE-REPORT] Generation trigger failed:", genRes.status);
        throw new Error("Report generation failed");
      }

      const reader = genRes.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      setReportReady(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(false);
    }
  }, [formData, questionAnswers]);

  if (generating) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
        <GlobalCSS />
        <TopBar m={m} />
        <GeneratingPage reportReady={reportReady} onContinue={() => { setGenerating(false); setReportReady(false); goTo(4); }} m={m} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
        <GlobalCSS />
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

  return (
    <div style={{ minHeight: "100vh", background: W.bg, fontFamily: F.body, overflowX: "hidden" }}>
      <GlobalCSS />
      <TopBar m={m} />
      {step === 0 && <Screen1 onNext={() => goTo(1)} m={m} />}
      {step === 1 && <Screen2 onNext={() => goTo(2)} onBack={() => goTo(0)} m={m} />}
      {step === 2 && <Screen3 onNext={() => goTo(3)} onBack={() => goTo(1)} m={m} formData={formData} setFormData={setFormData} />}
      {step === 3 && (
        <GuidedQuestions
          m={m}
          t={false}
          onNext={handleGenerate}
          onBack={() => goTo(2)}
          answers={questionAnswers}
          onAnswersChange={setQuestionAnswers}
        />
      )}
      {step === 4 && <Screen5 userEmail={userEmail} reportId={reportId} onBookDemo={() => setShowDemoModal(true)} m={m} formData={formData} />}
      {showDemoModal && <DemoBookingModal onClose={() => setShowDemoModal(false)} userEmail={userEmail} userName={userName} m={m} />}
    </div>
  );
}
