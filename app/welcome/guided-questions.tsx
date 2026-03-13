"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/*
 * WriteUp AI — Guided Questions Screen (v8 Production)
 * 
 * v8 changes from v7:
 * - REMOVED internal splash — TransitionSplash in welcome-client.tsx now handles
 *   the "questions" splash before this screen renders. No more duplicate splash.
 * - REMOVED "Generate My Report" button from completion state — auto-advances only
 * - Reworded last question: "Any notes for the asset manager outlook?" →
 *   "What should your investors know is coming?"
 * - Fixed background on completion state to use W.bg (white) to match design system
 * - Reduced auto-advance delay from 1500ms to 1200ms for snappier flow
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface QuestionTemplate {
  id: string;
  sort_order: number;
  section_key: string;
  section_label: string;
  section_icon: string;
  question_key: string;
  title: string;
  subtitle: string;
  hint: string;
  input_type: "number" | "percent" | "textarea" | "select" | "month_year";
  placeholder: string | null;
  options: string[] | null;
  min_tier: "foundational" | "professional" | "institutional";
  is_required: boolean;
}

interface GuidedQuestionsProps {
  onNext: () => void;
  onBack: () => void;
  m: boolean;
  t: boolean;
  answers?: Record<string, string | number>;
  onAnswersChange?: (answers: Record<string, string | number>) => void;
}

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const W = {
  accent: "#00B7DB", accentDark: "#0099B8",
  bg: "#FFFFFF", bgAlt: "#F7F5F1", bgWarm: "#FAF9F7",
  text: "#1A1A1A", textMid: "#4A4A4A", textSoft: "#7A7A7A", textMuted: "#A3A3A3",
  border: "#E8E5E0", borderL: "#F0EDE8",
  green: "#29581D", greenBg: "#F0F7ED",
  navy: "#002D5F",
  gold: "#B8960F",
  red: "#CC0000",
};
const F = {
  display: "'Newsreader','Georgia',serif",
  body: "'DM Sans','Helvetica Neue',sans-serif",
};

// ═══════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════
const guidedQuestionsCSS = `
@keyframes checkBounce{0%{transform:scale(0) rotate(-10deg);opacity:0}50%{transform:scale(1.2) rotate(4deg)}70%{transform:scale(0.95) rotate(-2deg)}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes pulseGlow{0%,100%{box-shadow:0 4px 16px rgba(0,183,219,0.2),0 0 0 0 rgba(0,183,219,0)}50%{box-shadow:0 4px 24px rgba(0,183,219,0.4),0 0 0 8px rgba(0,183,219,0.08)}}
.gq-modern-input{transition:border-color 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1),background 0.3s}
.gq-modern-input:focus{border-color:${W.accent}!important;box-shadow:0 0 0 3px rgba(0,183,219,0.08),0 2px 12px rgba(0,183,219,0.06)!important;background:#fff!important}
.gq-modern-input::placeholder{color:${W.textMuted}}
.gq-cta{transition:background 0.2s,transform 0.2s;animation:pulseGlow 2.5s ease-in-out infinite}
.gq-cta:active{transform:scale(0.98)}
.gq-option{transition:all 0.25s cubic-bezier(0.22,1,0.36,1)}
.gq-skip{transition:all 0.15s}
.gq-continue{transition:all 0.2s cubic-bezier(0.22,1,0.36,1)}
.gq-month-btn{transition:all 0.2s cubic-bezier(0.22,1,0.36,1)}
@media(hover:hover){
  .gq-cta:hover{background:${W.accentDark}!important;transform:translateY(-1px)}
  .gq-option:hover{border-color:${W.accent}!important;background:rgba(0,183,219,0.03)!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.06)!important}
  .gq-skip:hover{color:${W.textMid}!important;background:${W.bgAlt}!important}
  .gq-continue:hover{background:${W.accentDark}!important;transform:translateY(-1px)}
  .gq-month-btn:hover{border-color:${W.accent}!important;background:rgba(0,183,219,0.03)!important}
}
`;

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════
function Ic({ d, c = W.accent, s = 16 }: { d: string; c?: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
function Chk({ c = W.green, s = 14 }: { c?: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function ArrowR({ c = "#fff" }: { c?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function BackArrow() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
}

// ═══════════════════════════════════════════════════════════
// TEXT REVEAL GRADIENT
// ═══════════════════════════════════════════════════════════
function makeRevealGradient(baseColor: string): string {
  return `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 30%, #C97B84 36%, #D4A84C 42%, #7ABFBF 48%, #B09ED8 54%, #8DB98D 60%, transparent 66%, transparent 100%)`;
}

function revealStyle(swept: boolean, baseColor: string, enterDuration: number, reverseDuration: number, enterDelay = 0): React.CSSProperties {
  return {
    background: makeRevealGradient(baseColor),
    backgroundSize: "350% 350%",
    backgroundPosition: swept ? "0% 0%" : "100% 100%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    transition: swept
      ? `background-position ${enterDuration}s cubic-bezier(0.25,0.46,0.45,0.94) ${enterDelay}s`
      : `background-position ${reverseDuration}s cubic-bezier(0.55,0.06,0.68,0.19)`,
  };
}

// ═══════════════════════════════════════════════════════════
// MONTH HELPERS
// ═══════════════════════════════════════════════════════════
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ═══════════════════════════════════════════════════════════
// QUESTIONS — Report Period as Q1, reworded AM outlook as Q7
// ═══════════════════════════════════════════════════════════
const FALLBACK_QUESTIONS: QuestionTemplate[] = [
  { id: "0", sort_order: 0, section_key: "report_period", section_label: "Report Period", section_icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", question_key: "report_period", title: "What month is this report for?", subtitle: "Your report header and all analysis will reference this date. Your T-12 must include data for the month you select.", hint: "Select the most recent month covered by your T-12 operating statement.", input_type: "month_year", placeholder: null, options: null, min_tier: "foundational", is_required: false },
  { id: "1", sort_order: 1, section_key: "occupancy", section_label: "Occupancy & Leasing", section_icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", question_key: "occupancy", title: "What\u2019s your current occupancy?", subtitle: "This anchors the occupancy gauge and leasing velocity narrative your LPs see first.", hint: "Physical occupancy as of the reporting date. Economic occupancy is calculated from your T-12.", input_type: "percent", placeholder: "94", options: null, min_tier: "foundational", is_required: false },
  { id: "2", sort_order: 2, section_key: "occupancy", section_label: "Occupancy & Leasing", section_icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", question_key: "move_ins", title: "How many move-ins this month?", subtitle: "This shapes the leasing velocity narrative in your Occupancy & Leasing section.", hint: "New leases signed and moved in during the reporting period.", input_type: "number", placeholder: "8", options: null, min_tier: "foundational", is_required: false },
  { id: "3", sort_order: 3, section_key: "occupancy", section_label: "Occupancy & Leasing", section_icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", question_key: "move_outs", title: "And move-outs?", subtitle: "Net absorption tells your LPs whether the property is trending up or down.", hint: "Lease expirations, early terminations, and evictions combined.", input_type: "number", placeholder: "5", options: null, min_tier: "foundational", is_required: false },
  { id: "4", sort_order: 4, section_key: "revenue_expense_noi", section_label: "Revenue, Expense & NOI", section_icon: "M12 20V10M18 20V4M6 20v-4", question_key: "financial_changes", title: "Any notable financial changes?", subtitle: "Insurance renewals, utility rebates, renovation costs \u2014 anything that moved the numbers.", hint: "Our analysis engine weaves this into Revenue, Expense, and NOI narrative automatically.", input_type: "textarea", placeholder: "e.g. Property insurance renewed at 12% increase effective March 1. Completed 8 unit renovations averaging $14K each with $125/mo rent premium achieved.", options: null, min_tier: "foundational", is_required: false },
  { id: "5", sort_order: 5, section_key: "executive_summary", section_label: "Executive Summary", section_icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", question_key: "distribution", title: "What\u2019s the distribution status?", subtitle: "Your LPs want to know. This appears in the Executive Summary as a clear signal.", hint: "Select the option that best reflects this month\u2019s investor distribution.", input_type: "select", placeholder: null, options: ["On Track", "Delayed", "Suspended", "Not Applicable"], min_tier: "foundational", is_required: false },
  { id: "6", sort_order: 6, section_key: "asset_manager_outlook", section_label: "Asset Manager Outlook", section_icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", question_key: "am_notes", title: "What should your investors know is coming?", subtitle: "Capital projects, staffing changes, market observations \u2014 the forward-looking context that separates good reports from great ones.", hint: "This becomes the 30-60-90 day narrative in your Asset Manager Outlook section. The more specific, the better.", input_type: "textarea", placeholder: "e.g. Awarded landscaping contract to new vendor, saving $2,400/mo. Planning pool deck renovation in Q2. Two new hires starting in leasing next month.", options: null, min_tier: "foundational", is_required: false },
];

// ═══════════════════════════════════════════════════════════
// PROGRESS PILLS
// ═══════════════════════════════════════════════════════════
function ProgressPills({ current, total, answered, m }: { current: number; total: number; answered: Set<number>; m: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: m ? 5 : 6, justifyContent: "center", padding: "18px 0 10px" }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isDone = answered.has(i);
        const isPast = i < current;
        return (
          <div key={i} style={{
            width: isActive ? (m ? 36 : 44) : (m ? 8 : 10),
            height: m ? 8 : 10,
            borderRadius: 100,
            background: isDone ? W.green : isActive ? `linear-gradient(90deg, ${W.accent}, ${W.accentDark})` : isPast ? `${W.accent}35` : W.borderL,
            transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isActive ? `0 0 8px ${W.accent}30` : "none",
          }}>
            {isDone && !isActive && (
              <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TIMING CONSTANTS
// ═══════════════════════════════════════════════════════════
const REVERSE_MS = 600;
const SWAP_PAUSE = 60;
const AUTO_ADVANCE_MS = 600;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT — No internal splash (TransitionSplash handles it)
// ═══════════════════════════════════════════════════════════
export default function GuidedQuestions({ onNext, onBack, m, t, answers: initialAnswers, onAnswersChange }: GuidedQuestionsProps) {
  const [questions] = useState<QuestionTemplate[]>(FALLBACK_QUESTIONS);
  const [idx, setIdx] = useState(0);
  const [swept, setSwept] = useState(false);
  const [elementsIn, setElementsIn] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | number>>(initialAnswers || {});
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const transitioning = useRef(false);
  const total = questions.length;
  const isComplete = idx >= total;
  const q = questions[idx] || questions[total - 1];

  const now = new Date();
  const defMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selMonth, setSelMonth] = useState<number>((initialAnswers?.reportMonth as number) || defMonth);
  const [selYear, setSelYear] = useState<number>((initialAnswers?.reportYear as number) || defYear);

  // Initial reveal — immediate, no splash delay
  useEffect(() => {
    const t1 = setTimeout(() => setSwept(true), 150);
    const t2 = setTimeout(() => setElementsIn(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Sync month/year
  useEffect(() => {
    const newAnswers = { ...answers, reportMonth: selMonth, reportYear: selYear };
    setAnswers(newAnswers);
    onAnswersChange?.(newAnswers);
    setAnswered(prev => new Set([...prev, 0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMonth, selYear]);

  const navigateTo = useCallback((target: number) => {
    if (transitioning.current || target === idx) return;
    transitioning.current = true;
    setSwept(false);
    setElementsIn(false);
    setTimeout(() => {
      setIdx(target);
      setTimeout(() => {
        setSwept(true);
        setTimeout(() => setElementsIn(true), 200);
        transitioning.current = false;
      }, SWAP_PAUSE);
    }, REVERSE_MS);
  }, [idx]);

  const goNext = useCallback(() => navigateTo(Math.min(idx + 1, total)), [idx, total, navigateTo]);
  const goBack2 = useCallback(() => {
    if (idx === 0) { onBack(); } else { navigateTo(Math.max(idx - 1, 0)); }
  }, [idx, navigateTo, onBack]);

  const updateAnswer = useCallback((val: string | number) => {
    if (isComplete) return;
    const newAnswers = { ...answers, [q.question_key]: val };
    setAnswers(newAnswers);
    onAnswersChange?.(newAnswers);
    if (val && val.toString().trim()) { setAnswered(prev => new Set([...prev, idx])); }
  }, [idx, isComplete, q?.question_key, answers, onAnswersChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && q?.input_type !== "textarea") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [q, goNext]);

  useEffect(() => {
    if (q?.input_type === "select" && answers[q.question_key]) {
      const timer = setTimeout(() => goNext(), AUTO_ADVANCE_MS);
      return () => clearTimeout(timer);
    }
  }, [answers, q, goNext]);

  // Auto-advance on completion — no button, just fires
  useEffect(() => {
    if (!isComplete) return;
    const t2 = setTimeout(() => onNext(), 1200);
    return () => clearTimeout(t2);
  }, [isComplete, onNext]);

  const px = m ? 16 : t ? 32 : 40;
  const hasValue = !isComplete && (q?.input_type === "month_year" ? true : !!answers[q?.question_key]);
  const value = answers[q?.question_key];

  const baseInput: React.CSSProperties = {
    width: "100%", borderRadius: 12, outline: "none", boxSizing: "border-box",
    fontFamily: F.body, color: W.text,
    border: `1.5px solid ${W.borderL}`,
    background: `linear-gradient(145deg, ${W.bgWarm}, #FFFFFF)`,
  };

  const elIn = (delay = 0): React.CSSProperties => ({
    opacity: elementsIn ? 1 : 0,
    transform: elementsIn ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
    filter: elementsIn ? "blur(0)" : "blur(4px)",
    transition: elementsIn
      ? `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}s`
      : "all 0.3s cubic-bezier(0.55,0.06,0.68,0.19)",
  });

  // ═══ COMPLETION — arc countdown + stat badge + light sweep, auto-advances ═══
  if (isComplete) {
    return (
      <div style={{ minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", background: W.bg }}>
        <style>{guidedQuestionsCSS}{`
          @keyframes arcShrink{from{stroke-dashoffset:0}to{stroke-dashoffset:126}}
          @keyframes ringExpand{0%{transform:scale(0.6);opacity:0}50%{transform:scale(1.1);opacity:0.4}100%{transform:scale(1.4);opacity:0}}
          @keyframes completionSweep{0%{background-position:250% 0}100%{background-position:-250% 0}}
          @keyframes statSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        `}</style>

        {/* Arc countdown + checkmark + ring burst */}
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 24 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r="20" fill="none" stroke={W.border} strokeWidth="3" />
            <circle cx="40" cy="40" r="20" fill="none" stroke={W.green} strokeWidth="3" strokeLinecap="round" strokeDasharray="126" strokeDashoffset="0" style={{ animation: "arcShrink 1.2s linear 0.5s forwards" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(145deg, ${W.greenBg}, #E8F5E4)`, border: `2px solid ${W.green}18`, display: "flex", alignItems: "center", justifyContent: "center", animation: "checkBounce 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}>
              <Chk c={W.green} s={22} />
            </div>
          </div>
          <div style={{ position: "absolute", width: 64, height: 64, top: 8, left: 8, borderRadius: "50%", border: `2px solid ${W.green}`, opacity: 0, pointerEvents: "none", animation: "ringExpand 1s cubic-bezier(0.22,1,0.36,1) 0.3s both" }} />
        </div>

        {/* Headline */}
        <h2 style={{ ...revealStyle(true, W.text, 2, 0.5, 0.05), fontFamily: F.display, fontSize: m ? 28 : 36, fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.02em", textAlign: "center" }}>
          You&apos;re all set
        </h2>

        {/* Stat badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: W.greenBg, border: `1px solid ${W.green}18`, marginBottom: 14, animation: "statSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.5s both" }}>
          <Chk c={W.green} s={12} />
          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.green }}>{answered.size} of {total} answered</span>
        </div>

        {/* Subtitle */}
        <p style={{ ...revealStyle(true, W.textSoft, 2.4, 0.5, 0.15), fontFamily: F.body, fontSize: m ? 15 : 17, lineHeight: 1.6, margin: "0 auto", maxWidth: 420, textAlign: "center" }}>
          Preparing your data for report generation and our proprietary three-layer verification.
        </p>

        {/* Light sweep presence indicator */}
        <div style={{ width: 140, height: 2, borderRadius: 100, background: "rgba(232,229,224,0.6)", marginTop: 24, position: "relative", overflow: "hidden", opacity: 1, animation: "statSlideIn 0.4s ease 0.8s both" }}>
          <div style={{ position: "absolute", top: -2, left: 0, width: "100%", height: 6, borderRadius: 100, background: "linear-gradient(90deg, transparent 0%, transparent 25%, rgba(0,136,163,0.45) 42%, rgba(0,153,184,0.65) 50%, rgba(0,136,163,0.45) 58%, transparent 75%, transparent 100%)", backgroundSize: "280% 100%", filter: "blur(1.5px)", animation: "completionSweep 3s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 2, borderRadius: 100, background: "linear-gradient(90deg, transparent 0%, transparent 30%, rgba(0,136,163,0.55) 45%, rgba(0,153,184,0.8) 50%, rgba(0,136,163,0.55) 55%, transparent 70%, transparent 100%)", backgroundSize: "280% 100%", animation: "completionSweep 3s ease-in-out infinite" }} />
        </div>
      </div>
    );
  }

  // ═══ QUESTION STATE ═══
  return (
    <div style={{ minHeight: 500, display: "flex", flexDirection: "column", background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 40%, ${W.bgAlt} 70%, ${W.bg} 100%)` }}>
      <style>{guidedQuestionsCSS}</style>
      <div style={{ padding: `0 ${px}px` }}>
        <ProgressPills current={idx} total={total} answered={answered} m={m} />
        <div style={{ textAlign: "center", paddingBottom: 4 }}>
          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: W.textMuted }}>{idx + 1} of {total}</span>
          <span style={{ fontFamily: F.body, fontSize: 12, color: `${W.textMuted}60`, margin: "0 8px" }}>/</span>
          <span style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted }}>All optional</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: m ? "20px 20px" : "24px 40px" }}>
        <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 100, marginBottom: m ? 20 : 28, background: `linear-gradient(135deg, ${W.accent}06, ${W.accent}03)`, border: `1px solid ${W.accent}14`, ...elIn(0) }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: `${W.accent}10`, border: `1px solid ${W.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={q.section_icon} c={W.accent} s={11} />
            </div>
            <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: W.accent, letterSpacing: "0.02em" }}>{q.section_label}</span>
          </div>

          <h2 style={{ ...revealStyle(swept, W.text, 1.8, 0.55, 0.05), fontFamily: F.display, fontSize: m ? 26 : t ? 32 : 36, fontWeight: 500, lineHeight: 1.18, letterSpacing: "-0.02em", margin: "0 0 12px" }}>{q.title}</h2>
          <p style={{ ...revealStyle(swept, W.textSoft, 2.2, 0.5, 0.12), fontFamily: F.body, fontSize: m ? 14 : 15, lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 440 }}>{q.subtitle}</p>

          <div style={elIn(0.08)}>
            {q.input_type === "month_year" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxWidth: 360, margin: "0 auto 14px" }}>
                  {MONTH_ABBR.map((name, i) => {
                    const monthNum = i + 1;
                    const isSelected = selMonth === monthNum;
                    return (<button key={i} className="gq-month-btn" onClick={() => setSelMonth(monthNum)} style={{ padding: "10px 4px", borderRadius: 10, border: isSelected ? `2px solid ${W.accent}` : `1.5px solid ${W.borderL}`, background: isSelected ? `linear-gradient(145deg, ${W.accent}06, ${W.accent}02)` : `linear-gradient(145deg, ${W.bgWarm}, #FFFFFF)`, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? W.accent : W.textMid, boxShadow: isSelected ? `0 0 0 4px ${W.accent}08, 0 4px 16px rgba(0,183,219,0.08)` : "0 2px 8px rgba(0,0,0,0.02)", minHeight: 42 }}>{name}</button>);
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                  {[2025, 2026].map(y => {
                    const isSelected = selYear === y;
                    return (<button key={y} className="gq-month-btn" onClick={() => setSelYear(y)} style={{ padding: "10px 32px", borderRadius: 10, border: isSelected ? `2px solid ${W.accent}` : `1.5px solid ${W.borderL}`, background: isSelected ? `linear-gradient(145deg, ${W.accent}06, ${W.accent}02)` : `linear-gradient(145deg, ${W.bgWarm}, #FFFFFF)`, cursor: "pointer", fontFamily: F.body, fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? W.accent : W.textMid, boxShadow: isSelected ? `0 0 0 4px ${W.accent}08` : "none", minHeight: 44 }}>{y}</button>);
                  })}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, background: `linear-gradient(145deg, ${W.greenBg}, #E8F5E4)`, border: `1.5px solid ${W.green}20`, boxShadow: `0 2px 8px ${W.green}08` }}>
                  <div style={{ animation: "checkBounce 0.3s cubic-bezier(0.22,1,0.36,1) both" }}><Chk c={W.green} s={14} /></div>
                  <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.green }}>{MONTH_FULL[selMonth - 1]} {selYear}</span>
                </div>
              </div>
            )}

            {q.input_type === "number" && (
              <div style={{ maxWidth: 120, margin: "0 auto" }}>
                <input className="gq-modern-input" type="number" inputMode="numeric" placeholder={q.placeholder || ""} value={value ?? ""} onChange={e => updateAnswer(e.target.value)} style={{ ...baseInput, padding: "12px 14px", fontSize: 20, fontFamily: F.display, fontWeight: 600, textAlign: "center" }} />
              </div>
            )}

            {q.input_type === "percent" && (
              <div style={{ position: "relative", maxWidth: 140, margin: "0 auto" }}>
                <input className="gq-modern-input" type="number" inputMode="decimal" placeholder={q.placeholder || ""} value={value ?? ""} onChange={e => updateAnswer(e.target.value)} style={{ ...baseInput, padding: "12px 36px 12px 14px", fontSize: 20, fontFamily: F.display, fontWeight: 600, textAlign: "center" }} />
                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontFamily: F.display, fontSize: 18, fontWeight: 500, color: value ? W.accent : W.textMuted, transition: "color 0.3s", pointerEvents: "none" }}>%</div>
              </div>
            )}

            {q.input_type === "textarea" && (
              <textarea className="gq-modern-input" placeholder={q.placeholder || ""} value={value ?? ""} onChange={e => updateAnswer(e.target.value)} rows={m ? 4 : 3} style={{ ...baseInput, padding: m ? "14px" : "16px 20px", fontSize: m ? 15 : 16, lineHeight: 1.65, resize: "vertical", minHeight: m ? 110 : 96, textAlign: "left" }} />
            )}

            {q.input_type === "select" && q.options && (
              <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: m ? 10 : 12, textAlign: "left" }}>
                {q.options.map(opt => {
                  const selected = value === opt;
                  return (
                    <button key={opt} className="gq-option" onClick={() => updateAnswer(opt)} style={{ display: "flex", alignItems: "center", gap: 14, padding: m ? "16px 14px" : "18px 20px", borderRadius: 14, border: selected ? `2px solid ${W.accent}` : `1.5px solid ${W.borderL}`, background: selected ? `linear-gradient(145deg, ${W.accent}06, ${W.accent}02)` : `linear-gradient(145deg, ${W.bgWarm}, #FFFFFF)`, cursor: "pointer", textAlign: "left", boxShadow: selected ? `0 0 0 4px ${W.accent}08, 0 4px 16px rgba(0,183,219,0.08)` : "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, border: selected ? "none" : `2px solid ${W.border}`, background: selected ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)", boxShadow: selected ? `0 2px 8px ${W.accent}30` : "none" }}>
                        {selected && <Chk c="#fff" s={12} />}
                      </div>
                      <span style={{ fontFamily: F.body, fontSize: m ? 15 : 16, fontWeight: selected ? 600 : 500, color: selected ? W.accent : W.text, transition: "all 0.2s" }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 16px", borderRadius: 12, background: `linear-gradient(135deg, ${W.bgAlt}, ${W.bgWarm})`, maxWidth: 460, margin: "20px auto 0", ...elIn(0.18) }}>
            <Ic d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" c={W.textMuted} s={14} />
            <span style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted, lineHeight: 1.5 }}>{q.hint}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: `16px ${px}px ${m ? 20 : 28}px`, display: "flex", alignItems: "center", justifyContent: "center", gap: m ? 8 : 12 }}>
        <button className="gq-skip" onClick={goBack2} style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: W.textMuted, background: "none", border: "none", cursor: "pointer", padding: "12px 16px", minHeight: 48, display: "flex", alignItems: "center", gap: 6 }}>
          <BackArrow /> Back
        </button>
        {q.input_type !== "month_year" && (
          <button className="gq-skip" onClick={goNext} style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: W.textMuted, background: "transparent", border: `1px solid ${W.borderL}`, borderRadius: 10, cursor: "pointer", padding: "12px 24px", minHeight: 48 }}>Skip</button>
        )}
        <button className="gq-continue" onClick={goNext} style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: "#fff", background: hasValue ? W.accent : `${W.accent}60`, border: "none", borderRadius: 12, cursor: "pointer", padding: "12px 36px", minHeight: 48, display: "flex", alignItems: "center", gap: 8, boxShadow: hasValue ? `0 4px 16px ${W.accent}25` : "none" }}>
          {idx === total - 1 ? "Review" : "Continue"} <ArrowR />
        </button>
      </div>

      {!m && (
        <div style={{ textAlign: "center", paddingBottom: 16 }}>
          <span style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted }}>
            Press <span style={{ padding: "2px 8px", borderRadius: 4, background: W.bg, border: `1px solid ${W.borderL}`, fontFamily: "monospace", fontSize: 10 }}>Enter</span> to continue
            {q?.input_type === "textarea" && (<> · <span style={{ padding: "2px 8px", borderRadius: 4, background: W.bg, border: `1px solid ${W.borderL}`, fontFamily: "monospace", fontSize: 10 }}>Shift+Enter</span> for new line</>)}
          </span>
        </div>
      )}
    </div>
  );
}
