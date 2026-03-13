"use client";

import { useState, useEffect, useRef } from "react";

/*
 * WriteUp AI — Generating Page (v2 Production)
 *
 * Standalone component used by welcome-client.tsx during report generation.
 * Shows: splash morph → sticky progress → math verification → LinkedIn reviews
 *        → WriteUp Intelligence → pricing → features → FAQ
 *
 * Props:
 *   reportReady  — true when generation stream completes
 *   onContinue   — called when user clicks "View Your Report"
 *   m            — mobile breakpoint (width < 640)
 */

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
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
const LI = { blue: "#0A66C2", bg: "#F4F2EE", card: "#FFFFFF", text: "#191919", sub: "#666666", muted: "#00000099", border: "#E0DFDC", react: "#F0F0F0" };

// ═══════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════
const generatingCSS = `
@keyframes breathe{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes marqueeScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes checkPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes ringPulse{0%{box-shadow:0 0 0 0 rgba(0,183,219,0.3)}70%{box-shadow:0 0 0 20px rgba(0,183,219,0)}100%{box-shadow:0 0 0 0 rgba(0,183,219,0)}}
@keyframes dotSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes morphGlow{0%{box-shadow:0 0 0 0 rgba(0,183,219,0)}40%{box-shadow:0 0 40px 10px rgba(0,183,219,0.15)}100%{box-shadow:0 0 0 0 rgba(0,183,219,0)}}
.gp-plan-card{transition:box-shadow 0.3s,transform 0.3s}
@media(hover:hover){.gp-plan-card:hover{box-shadow:0 12px 40px rgba(0,0,0,0.08)!important;transform:translateY(-3px)}}
.gp-card-lift{transition:box-shadow 0.25s,transform 0.25s}
@media(hover:hover){.gp-card-lift:hover{box-shadow:0 8px 28px rgba(0,0,0,0.06)!important;transform:translateY(-2px)}}
.gp-faq-btn{transition:all 0.2s}
@media(hover:hover){.gp-faq-btn:hover{background:${W.bgWarm}!important}}
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

// ═══════════════════════════════════════════════════════════
// INTRO SPLASH → morphs into sticky progress bar
// ═══════════════════════════════════════════════════════════
function IntroSplash({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 3000),
      setTimeout(() => setStep(4), 4200),
      setTimeout(() => onComplete(), 4800),
    ];
    return () => t.forEach(clearTimeout);
  }, [onComplete]);

  const morphing = step >= 3;
  const fading = step >= 4;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, background: W.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: morphing ? "flex-start" : "center",
      paddingTop: morphing ? 14 : 0,
      transition: "all 0.8s cubic-bezier(0.32, 0.72, 0, 1)",
      opacity: fading ? 0 : 1,
      pointerEvents: fading ? "none" : "auto",
      animation: morphing && !fading ? "morphGlow 1.2s ease-out" : "none",
    }}>
      <div style={{
        width: morphing ? 24 : 80, height: morphing ? 24 : 80,
        borderRadius: morphing ? 6 : "50%",
        background: `${W.accent}08`, border: morphing ? `1px solid ${W.accent}15` : `2px solid ${W.accent}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: morphing ? "none" : "ringPulse 1.5s ease-out infinite",
        marginBottom: morphing ? 0 : 28,
        transition: "all 0.8s cubic-bezier(0.32, 0.72, 0, 1)",
      }}>
        {!morphing && (
          <div style={{ width: 40, height: 40, position: "relative", animation: "dotSpin 2s linear infinite" }}>
            {[0, 1, 2, 3].map(i => <div key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: W.accent, opacity: 0.3 + i * 0.2, top: i === 0 ? 0 : i === 2 ? 34 : 17, left: i === 1 ? 34 : i === 3 ? 0 : 17 }} />)}
          </div>
        )}
        {morphing && <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.accent} s={12} />}
      </div>
      <div style={{
        fontFamily: morphing ? F.body : F.display,
        fontSize: morphing ? 13 : 24, fontWeight: morphing ? 600 : 500,
        color: W.text, marginBottom: morphing ? 6 : 8,
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? "translateY(0)" : "translateY(8px)",
        transition: "all 0.6s cubic-bezier(0.32, 0.72, 0, 1)",
      }}>
        Generating your report
      </div>
      <div style={{
        fontFamily: F.body, fontSize: 14, color: W.textSoft,
        opacity: step >= 2 && !morphing ? 1 : 0,
        transition: "all 0.4s", textAlign: "center", maxWidth: 320,
        height: morphing ? 0 : "auto", overflow: "hidden",
      }}>
        While you wait, explore what WriteUp AI can do for your firm
      </div>
      {morphing && (
        <div style={{ width: "min(100% - 48px, 600px)", height: 4, borderRadius: 100, background: W.borderL, overflow: "hidden", marginTop: 2 }}>
          <div style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${W.accent}, ${W.accentDark})`, width: "8%", transition: "width 0.5s" }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LINKEDIN COMPONENTS
// ═══════════════════════════════════════════════════════════
function LiPost({ initials, color, role, org, detail, timeAgo, text, likes, comments, m }: { initials: string; color: string; role: string; org: string; detail?: string; timeAgo: string; text: string; likes: number; comments: number; m: boolean }) {
  return (
    <div style={{ flexShrink: 0, width: m ? 320 : 400, background: LI.card, borderRadius: 8, border: `1px solid ${LI.border}`, fontFamily: "'Segoe UI','DM Sans',sans-serif", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 0", display: "flex", gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: LI.text }}>{role}</div>
          <div style={{ fontSize: 12, color: LI.sub, lineHeight: 1.3 }}>{org}</div>
          {detail && <div style={{ fontSize: 12, color: LI.sub }}>{detail}</div>}
          <div style={{ fontSize: 12, color: LI.muted, marginTop: 2 }}>{timeAgo}</div>
        </div>
      </div>
      <div style={{ padding: "10px 16px 12px", fontSize: 13.5, color: LI.text, lineHeight: 1.55, whiteSpace: "pre-line" as const }}>{text}</div>
      <div style={{ borderTop: `1px solid ${LI.border}`, padding: "6px 16px", display: "flex", justifyContent: "space-between", fontSize: 12, color: LI.sub }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <svg width="14" height="14" viewBox="0 0 16 16"><defs><linearGradient id={"lg" + initials} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#378FE9" /><stop offset="100%" stopColor="#0A66C2" /></linearGradient></defs><circle cx="8" cy="8" r="8" fill={`url(#lg${initials})`} /><path d="M11.5 7.2h-2l.4-1.9c.1-.4-.2-.8-.6-.8h-.2c-.2 0-.3.1-.4.2L7 7.2H5.5c-.3 0-.5.2-.5.5v3.6c0 .3.2.5.5.5H10c.4 0 .8-.3.9-.7l.9-2.7c.1-.3-.1-.7-.4-.7l.1-.5z" fill="#fff" /></svg>
          <span style={{ marginLeft: 2 }}>{likes}</span>
        </div>
        <span>{comments} comments</span>
      </div>
    </div>
  );
}

function LiDM({ initials, color, name, timeAgo, msgs, m }: { initials: string; color: string; name: string; timeAgo: string; msgs: { text: string; sent: boolean }[]; m: boolean }) {
  return (
    <div style={{ flexShrink: 0, width: m ? 310 : 380, background: LI.card, borderRadius: 8, border: `1px solid ${LI.border}`, fontFamily: "'Segoe UI','DM Sans',sans-serif", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${LI.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{initials}</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: "#31A24C", border: "2px solid #fff" }} />
        </div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: LI.text }}>{name}</div><div style={{ fontSize: 11, color: LI.sub }}>{timeAgo}</div></div>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.sent ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: msg.sent ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.sent ? LI.blue : LI.react, color: msg.sent ? "#fff" : LI.text, fontSize: 12.5, lineHeight: 1.45 }}>{msg.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiRec({ initials, color, role, org, timeAgo, text, m }: { initials: string; color: string; role: string; org: string; timeAgo: string; text: string; m: boolean }) {
  return (
    <div style={{ flexShrink: 0, width: m ? 320 : 400, background: LI.card, borderRadius: 8, border: `1px solid ${LI.border}`, fontFamily: "'Segoe UI','DM Sans',sans-serif", padding: 16 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: LI.text }}>{role}</div>
          <div style={{ fontSize: 12, color: LI.sub }}>{org}</div>
          <div style={{ fontSize: 12, color: LI.muted, marginTop: 1 }}>{timeAgo}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>{[0, 1, 2, 3, 4].map(i => <span key={i} style={{ color: "#E7A33E", fontSize: 15 }}>&#9733;</span>)}</div>
      <div style={{ fontSize: 13.5, color: LI.text, lineHeight: 1.6, whiteSpace: "pre-line" as const }}>{text}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REVIEW MARQUEE
// ═══════════════════════════════════════════════════════════
function ReviewMarquee({ m }: { m: boolean }) {
  const items = [
    <LiPost key="p1" initials="VP" color="#1B4332" role="VP of Asset Management" org="Regional multifamily operator" detail="Sunbelt portfolio, 2,400+ units" timeAgo="3d" text={"Started using WriteUp AI two months ago. The reports look like they came from a CBRE research desk. Revenue waterfalls, occupancy gauges, rent comp tables — all branded to our firm.\n\nThe math validation caught errors our controller missed. Two properties. Four reports. Maybe 30 minutes of my time total."} likes={47} comments={14} m={m} />,
    <LiRec key="r1" initials="MD" color="#004D40" role="Managing Director" org="Institutional multifamily operator · 32 properties" timeAgo="Reviewed 2 weeks ago" text={"The report pipeline changed everything. Draft, review, approve, send — all tracked. My analysts draft, I review, partners approve. Email notifications at every stage. No more 'did you send the report?' Slack messages. 32 properties, zero missed deadlines since we switched."} m={m} />,
    <LiPost key="p2" initials="MP" color="#5C2D91" role="Managing Partner" org="Multifamily PE firm" detail="16 properties across TX & GA" timeAgo="1w" text={"Our old process: OneDrive spreadsheets feeding Word templates. 3 full days of formatting. Charts that rendered as gray boxes in PDF.\n\nAn LP called to say our reports were 'the most professional communications he receives from any sponsor.' 16 properties. Under an hour total."} likes={91} comments={23} m={m} />,
    <LiDM key="d1" initials="AM" color="#2E7D32" name="Asset Manager" timeAgo="Active now" msgs={[
      { text: "What are you using for your reports now? Charts looked institutional.", sent: false },
      { text: "WriteUp AI. Upload T-12, answer a few questions, full report in minutes.", sent: true },
      { text: "We spend 2 full days per property. OneDrive formulas break constantly.", sent: false },
      { text: "That was us. Math validation alone was worth it — every number verified before it generates.", sent: true },
    ]} m={m} />,
    <LiRec key="r2" initials="IR" color="#BF360C" role="Head of Investor Relations" org="Multifamily PE firm · 12 assets" timeAgo="Reviewed 1 month ago" text={"The team workspace is what sold my partners. Analysts draft reports, I review the narrative, our MD approves with one click. Everyone gets email notifications when it's their turn. The whole pipeline from upload to LP delivery is tracked. We went from a 3-day process to a half-day across the entire portfolio."} m={m} />,
    <LiPost key="p3" initials="DA" color="#00263A" role="Director of Acquisitions" org="Institutional multifamily fund" timeAgo="4d" text={"Sent our first report built with WriteUp AI. The managing partner of our largest LP responded in 11 minutes.\n\nHis exact words: 'This is the clearest picture we've had of the asset's performance.'\n\nWe've managed his capital for 6 years. First time he's commented on a report."} likes={63} comments={9} m={m} />,
    <LiDM key="d2" initials="IR" color="#AD1457" name="VP Investor Relations" timeAgo="2h" msgs={[
      { text: "Still using WriteUp AI for monthly reporting?", sent: false },
      { text: "Every month since September. Team gets notified by email when reports are ready for review.", sent: true },
      { text: "Our process is Excel to PowerPoint to PDF. Takes forever.", sent: false },
      { text: "Night and day. Our LP advisory board mentioned the improvement. Didn't tell them we switched tools.", sent: true },
    ]} m={m} />,
    <LiRec key="r3" initials="PA" color="#283593" role="Principal" org="Value-add multifamily fund · Former McKinsey" timeAgo="Reviewed 3 weeks ago" text={"The Settings page is where this product separates itself. Writing tone, analysis depth, variance thresholds, terminology level — all configurable per firm. We set ours to Institutional PE with 3% variance flagging and comprehensive analysis. Every report comes out at that standard. Every property. Every month. No drift."} m={m} />,
    <LiPost key="p4" initials="CT" color="#8B4513" role="Controller · CPA" org="PE-backed multifamily fund" detail="Previously Big 4 RE advisory" timeAgo="2w" text={"As someone who spent 4 years auditing real estate funds, I'm skeptical of auto-generated reports. I went through three reports line by line.\n\nEvery NOI calculation tied to the T-12. Expense variances matched budget to the penny. The platform shows exactly which source document each number came from.\n\nCautiously impressed."} likes={38} comments={11} m={m} />,
    <LiDM key="d3" initials="PM" color="#1565C0" name="Portfolio Manager" timeAgo="Yesterday" msgs={[
      { text: "Just generated my first report on WriteUp AI.", sent: false },
      { text: "How did it go?", sent: true },
      { text: "It caught a rounding error in my T-12 expense subtotals. My own spreadsheet had the wrong number for 3 months.", sent: false },
      { text: "Wait till you see LP response. Ours went from ignoring reports to replying with questions.", sent: true },
    ]} m={m} />,
    <LiRec key="r4" initials="DO" color="#E65100" role="Director of Operations" org="Third-party property management · 8 ownership groups" timeAgo="Reviewed 1 week ago" text={"We manage for 8 different ownership groups. Each wanted reports 'their way.' One analyst trying to maintain 8 templates for 23 properties. She almost quit.\n\nNow every owner gets a branded report with their firm's logo and colors. The email delivery system sends reports directly to LPs — no more manual email formatting. Analyst spends time analyzing, not formatting."} m={m} />,
    <LiPost key="p5" initials="AM" color="#C2185B" role="Asset Manager" org="Value-add multifamily operator" detail="Southeast portfolio" timeAgo="5d" text={"The hardest part of investor reporting isn't the numbers. It's writing narrative that makes numbers mean something.\n\nWriteUp AI reads the T-12, cross-references prior month and budget, then writes analysis that puts performance in context. Our LPs get a report that's equal parts boardroom presentation and financial audit."} likes={54} comments={8} m={m} />,
  ];
  const doubled = [...items, ...items];
  const [paused, setPaused] = useState(false);
  return (
    <div style={{ overflow: "hidden", width: "100%", position: "relative", padding: "8px 0" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${W.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${W.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
      <div onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} style={{ display: "flex", gap: 20, width: "max-content", alignItems: "flex-start", animation: "marqueeScroll 90s linear infinite", animationPlayState: paused ? "paused" : "running", cursor: "grab" }}>
        {doubled}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INTERSECTION OBSERVER
// ═══════════════════════════════════════════════════════════
function useInView(threshold = 0.3): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ═══════════════════════════════════════════════════════════
// RGB TEXT REVEAL
// ═══════════════════════════════════════════════════════════
function makeRevealGradient(baseColor: string): string {
  return `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 30%, #C97B84 36%, #D4A84C 42%, #7ABFBF 48%, #B09ED8 54%, #8DB98D 60%, transparent 66%, transparent 100%)`;
}

function RgbText({ children, visible, delay = 0, style = {} }: { children: React.ReactNode; visible: boolean; delay?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ ...style, background: makeRevealGradient(W.text), backgroundSize: "350% 350%", backgroundPosition: visible ? "0% 0%" : "100% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", transition: `background-position 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s` }}>
      {children}
    </div>
  );
}

function RgbBody({ children, visible, delay = 0, style = {} }: { children: React.ReactNode; visible: boolean; delay?: number; style?: React.CSSProperties }) {
  return (
    <p style={{ ...style, background: makeRevealGradient(W.textMid), backgroundSize: "350% 350%", backgroundPosition: visible ? "0% 0%" : "100% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", transition: `background-position 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s` }}>
      {children}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════
// ANIMATED SETTINGS MOCKUPS
// ═══════════════════════════════════════════════════════════
function SettingsMockupAnimated({ label, sub, options, startActive, m, visible }: { label: string; sub: string; options: { n: string; s: string }[]; startActive: number; m: boolean; visible: boolean }) {
  const [active, setActive] = useState(startActive);
  useEffect(() => { if (!visible) return; const t = setInterval(() => setActive(prev => (prev + 1) % options.length), 2200); return () => clearInterval(t); }, [visible, options.length]);
  return (
    <div style={{ background: W.bg, borderRadius: 12, padding: m ? 14 : 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: `1px solid ${W.borderL}` }}>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginBottom: 10 }}>{sub}</div>
      <div style={{ display: "flex", gap: 5 }}>
        {options.map((o, i) => (
          <div key={i} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, textAlign: "center" as const, background: i === active ? `${W.accent}06` : W.bgWarm, border: i === active ? `1.5px solid ${W.accent}30` : `1px solid ${W.borderL}`, transition: "all 0.5s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: i === active ? 600 : 500, color: i === active ? W.accent : W.textMid, transition: "all 0.4s" }}>{o.n}</div>
            <div style={{ fontFamily: F.body, fontSize: 9, color: W.textSoft, marginTop: 1 }}>{o.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderMockupAnimated({ m, visible }: { m: boolean; visible: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => { if (!visible) return; const t1 = setTimeout(() => setVal(33), 300); const t2 = setInterval(() => setVal(prev => prev === 33 ? 25 : prev === 25 ? 40 : 33), 2500); return () => { clearTimeout(t1); clearInterval(t2); }; }, [visible]);
  return (
    <div style={{ background: W.bg, borderRadius: 12, padding: m ? 14 : 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: `1px solid ${W.borderL}` }}>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 2 }}>Variance Threshold</div>
      <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginBottom: 10 }}>Flag variances above {Math.round(val * 15 / 100 + 1)}%</div>
      <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
        <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 4, borderRadius: 2, background: W.borderL }} />
        <div style={{ position: "absolute", top: 6, left: 0, width: `${val}%`, height: 4, borderRadius: 2, background: W.accent, transition: "width 0.8s cubic-bezier(0.32,0.72,0,1)" }} />
        <div style={{ position: "absolute", top: 1, left: `calc(${val}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: W.accent, border: "2px solid #fff", boxShadow: `0 1px 4px rgba(0,0,0,0.15), 0 0 8px ${W.accent}30`, transition: "left 0.8s cubic-bezier(0.32,0.72,0,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontSize: 9, color: W.textMuted }}>
        <span>1% (more sensitive)</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: W.accent, opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.8s" }}>{Math.round(val * 15 / 100 + 1)}%</span>
        <span>15% (less sensitive)</span>
      </div>
    </div>
  );
}

function ToggleMockupAnimated({ label, sub, on, m, visible }: { label: string; sub: string; on: boolean; m: boolean; visible: boolean }) {
  const [isOn, setIsOn] = useState(false);
  useEffect(() => { if (!visible) return; const t1 = setTimeout(() => setIsOn(on), 600); const t2 = setInterval(() => setIsOn(prev => !prev), 2800); return () => { clearTimeout(t1); clearInterval(t2); }; }, [visible, on]);
  return (
    <div style={{ background: W.bg, borderRadius: 12, padding: m ? 14 : 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: `1px solid ${W.borderL}` }}>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: F.body, fontSize: 11, color: W.textMuted, marginBottom: 10 }}>{sub}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 40, height: 22, borderRadius: 11, position: "relative" as const, background: isOn ? W.accent : W.borderL, boxShadow: isOn ? `0 0 10px ${W.accent}30` : "none", transition: "background 0.4s cubic-bezier(0.32,0.72,0,1), box-shadow 0.4s" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", position: "absolute" as const, top: 2, left: 2, transform: isOn ? "translateX(18px)" : "translateX(0)", transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)" }} />
        </div>
        <span style={{ fontFamily: F.body, fontSize: 12, color: isOn ? W.accent : W.textMuted, fontWeight: isOn ? 600 : 400, transition: "all 0.3s" }}>{isOn ? "Enabled" : "Disabled"}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INTELLIGENCE SECTION
// ═══════════════════════════════════════════════════════════
function IntelligenceAnimated({ m, t }: { m: boolean; t: boolean }) {
  const [ref1, vis1] = useInView(0.05);
  const [ref2, vis2] = useInView(0.05);
  const [ref3, vis3] = useInView(0.05);
  const [refH, visH] = useInView(0.1);
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div ref={refH} style={{ textAlign: "center", marginBottom: m ? 28 : 44 }}>
        <RgbText visible={visH} delay={0} style={{ fontFamily: F.display, fontSize: m ? 26 : 38, fontWeight: 500, margin: "0 0 8px" }}>WriteUp Intelligence</RgbText>
        <RgbBody visible={visH} delay={0.2} style={{ fontFamily: F.body, fontSize: m ? 13 : 16, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>Your reports shouldn&apos;t sound generic. WriteUp Intelligence lets you control the voice, depth, and precision of every report your firm produces.</RgbBody>
      </div>
      <div ref={ref1} style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 16 : 32, alignItems: "center", marginBottom: m ? 44 : 72 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8, opacity: vis1 ? 1 : 0, transition: "opacity 0.4s ease 0.1s" }}>Voice & Style</div>
          <RgbText visible={vis1} delay={0.1} style={{ fontFamily: F.display, fontSize: m ? 22 : 28, fontWeight: 500, margin: "0 0 10px" }}>Reports that sound like your firm wrote them</RgbText>
          <RgbBody visible={vis1} delay={0.3} style={{ fontFamily: F.body, fontSize: m ? 13 : 15, lineHeight: 1.7, margin: 0 }}>Choose between Formal, Professional, or Direct tone. Set Standard CRE or Institutional PE terminology. Your analysts draft; WriteUp writes in your voice.</RgbBody>
        </div>
        <div style={{ width: m ? "100%" : 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, opacity: vis1 ? 1 : 0, transform: vis1 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)", transition: "all 0.6s cubic-bezier(0.32,0.72,0,1) 0.4s" }}>
          <SettingsMockupAnimated label="Writing Tone" sub="The voice of your report narrative" options={[{ n: "Formal", s: "Third-person, institutional" }, { n: "Professional", s: "Clear, direct tone" }, { n: "Direct", s: "Concise, minimal filler" }]} startActive={1} m={m} visible={vis1} />
          <SettingsMockupAnimated label="Terminology Level" sub="Financial vocabulary in reports" options={[{ n: "Standard CRE", s: "Revenue, NOI, occupancy" }, { n: "Institutional PE", s: "GPR, EGI, T-12, same-store" }]} startActive={0} m={m} visible={vis1} />
        </div>
      </div>
      <div ref={ref2} style={{ display: "flex", flexDirection: m ? "column-reverse" : "row", gap: m ? 16 : 32, alignItems: "center", marginBottom: m ? 44 : 72 }}>
        <div style={{ width: m ? "100%" : 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, opacity: vis2 ? 1 : 0, transform: vis2 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)", transition: "all 0.6s cubic-bezier(0.32,0.72,0,1) 0.4s" }}>
          <SettingsMockupAnimated label="Analysis Depth" sub="How detailed commentary should be" options={[{ n: "Summary", s: "Key metrics only" }, { n: "Standard", s: "Balanced with context" }, { n: "Comprehensive", s: "Deep with comparisons" }]} startActive={1} m={m} visible={vis2} />
          <SliderMockupAnimated m={m} visible={vis2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8, opacity: vis2 ? 1 : 0, transition: "opacity 0.4s ease 0.1s" }}>Analysis Engine</div>
          <RgbText visible={vis2} delay={0.1} style={{ fontFamily: F.display, fontSize: m ? 22 : 28, fontWeight: 500, margin: "0 0 10px" }}>Control how deep every section goes</RgbText>
          <RgbBody visible={vis2} delay={0.3} style={{ fontFamily: F.body, fontSize: m ? 13 : 15, lineHeight: 1.7, margin: 0 }}>Summary mode gives LPs the headlines. Standard balances depth with brevity. Comprehensive delivers institutional-grade analysis with trailing comparisons and per-unit breakdowns. The variance threshold lets you decide what&apos;s material enough to flag.</RgbBody>
        </div>
      </div>
      <div ref={ref3} style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 16 : 32, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: W.accent, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8, opacity: vis3 ? 1 : 0, transition: "opacity 0.4s ease 0.1s" }}>Intelligence Layer</div>
          <RgbText visible={vis3} delay={0.1} style={{ fontFamily: F.display, fontSize: m ? 22 : 28, fontWeight: 500, margin: "0 0 10px" }}>The insights your LPs wish you&apos;d include</RgbText>
          <RgbBody visible={vis3} delay={0.3} style={{ fontFamily: F.body, fontSize: m ? 13 : 15, lineHeight: 1.7, margin: 0 }}>Cross-Section Insights connects patterns your LPs would otherwise miss. Forward Outlook projects 30-60-90 day trends and flags seasonal risks before they materialize. These are the analysis layers that separate a compliance report from an investment-grade communication.</RgbBody>
        </div>
        <div style={{ width: m ? "100%" : 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, opacity: vis3 ? 1 : 0, transform: vis3 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)", transition: "all 0.6s cubic-bezier(0.32,0.72,0,1) 0.4s" }}>
          <ToggleMockupAnimated label="Cross-Section Insights" sub="Connect patterns across sections" on={true} m={m} visible={vis3} />
          <ToggleMockupAnimated label="Forward Outlook" sub="30-60-90 day projections" on={false} m={m} visible={vis3} />
          <SettingsMockupAnimated label="Risk Severity Labels" sub="Framework for risk categorization" options={[{ n: "Monitor / Action", s: "Monitor or Action Required" }, { n: "Low / Med / High", s: "Low, Medium, High" }]} startActive={0} m={m} visible={vis3} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════
const PRICING: Record<string, Record<string, number>> = { foundational: { monthly: 75, quarterly: 207, yearly: 747 }, professional: { monthly: 299, quarterly: 825, yearly: 2978 }, institutional: { monthly: 750, quarterly: 2070, yearly: 7470 } };
const DISC: Record<string, number> = { monthly: 0, quarterly: 8, yearly: 17 };
function perMo(tier: string, cycle: string): number { const p = PRICING[tier][cycle]; return cycle === "monthly" ? p : cycle === "quarterly" ? Math.round(p / 3) : Math.round(p / 12); }

// ═══════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════
const FAQ = [
  { q: "How is this different from pasting my T-12 into ChatGPT?", a: "ChatGPT returns a paragraph. WriteUp AI returns a multi-section branded investor report with revenue waterfall charts, expense variance bars, occupancy gauges, KPI cards with MoM comparisons, your firm's logo and colors, and a PDF that renders identically across browsers." },
  { q: "Will my investors know this was generated by AI?", a: "No. Reports carry your firm's logo, brand colors, and custom disclaimer. No AI watermarks. Every section is reviewed and approved by your team before export." },
  { q: "Does the AI make up numbers?", a: "The AI does not guess. It parses your uploaded T-12 line by line and extracts exact values. All analysis stops at NOI — no debt service, no distributions unless you explicitly provide that data." },
  { q: "Can I edit the report before sending it?", a: "Every section is independently editable. Change a word, rewrite a paragraph, or regenerate individual sections with custom instructions." },
  { q: "What happens to my data?", a: "Encrypted in transit and at rest. Row-level security. Not shared with other users, not used to train AI models." },
  { q: "Is the pricing justified?", a: "Consider the Institutional plan at $750/property/month. Each report reads as if it were produced by a full executive team. Assembling that level of expertise manually costs $200-400/hour across 4-6 professionals and 8+ hours per property. The time savings alone justify the investment. The quality increase — and the LP retention it drives — is where the real ROI compounds." },
];

function FAQSection({ m }: { m: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {FAQ.map((item, i) => (
        <div key={i} style={{ background: open === i ? W.bgWarm : W.bg, border: `1px solid ${open === i ? W.accent + "25" : W.borderL}`, borderRadius: 14, overflow: "hidden", transition: "all 0.25s" }}>
          <button className="gp-faq-btn" onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: m ? "14px 16px" : "16px 22px", background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: m ? 14 : 15, fontWeight: 600, color: W.text, textAlign: "left" as const, gap: 16 }}>
            <span>{item.q}</span>
            <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: open === i ? `${W.accent}12` : W.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: open === i ? W.accent : W.textSoft, transition: "all 0.25s", transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
          </button>
          <div style={{ maxHeight: open === i ? 400 : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ padding: `0 ${m ? 16 : 22}px 16px`, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, color: W.textMid }}>{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT — Production GeneratingPage
// ═══════════════════════════════════════════════════════════
interface GeneratingPageProps {
  reportReady: boolean;
  onContinue: () => void;
  m: boolean;
}

export default function GeneratingPage({ reportReady, onContinue, m }: GeneratingPageProps) {
  const t = typeof window !== "undefined" && window.innerWidth >= 640 && window.innerWidth < 1024;
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Extracting financial data...");
  const [sectionsRevealed, setSectionsRevealed] = useState(0);
  const [cycle, setCycle] = useState("monthly");
  const px = m ? 16 : t ? 32 : 40;

  // Progress phases — override when reportReady
  useEffect(() => {
    if (reportReady) { setProgress(100); setPhase("Report complete"); return; }
    if (showSplash) return;
    const phases = [{ p: 12, l: "Parsing T-12 line items..." }, { p: 28, l: "Building source data registry..." }, { p: 45, l: "Generating Executive Summary..." }, { p: 60, l: "Analyzing occupancy & leasing..." }, { p: 75, l: "Running revenue analysis..." }, { p: 88, l: "Computing NOI performance..." }, { p: 96, l: "Math verification..." }];
    let i = 0;
    const t2 = setInterval(() => { if (i < phases.length) { setProgress(phases[i].p); setPhase(phases[i].l); i++; } }, 2500);
    return () => clearInterval(t2);
  }, [showSplash, reportReady]);

  // Section reveal animation
  useEffect(() => { if (showSplash) return; const t2 = setInterval(() => setSectionsRevealed(p => Math.min(p + 1, 4)), 400); return () => clearInterval(t2); }, [showSplash]);

  return (
    <div style={{ background: W.bg }}>
      <style>{generatingCSS}</style>
      {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}

      {/* STICKY PROGRESS / READY BANNER */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: W.bg, borderBottom: `1px solid ${W.borderL}`, padding: m ? "10px 16px" : "12px 24px", opacity: showSplash ? 0 : 1, transition: "opacity 0.4s ease 0.1s" }}>
        {reportReady ? (
          <div style={{ display: "flex", flexDirection: m ? "column" : "row", alignItems: "center", gap: m ? 10 : 16, padding: "14px 18px", borderRadius: 12, background: W.greenBg, border: `1px solid ${W.green}25`, animation: "slideDown 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", border: `1px solid ${W.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "checkPop 0.4s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}><Chk c={W.green} s={20} /></div>
              <div><div style={{ fontFamily: F.body, fontSize: 16, fontWeight: 700, color: W.green }}>Your report is ready — 5 sections verified</div><div style={{ fontFamily: F.body, fontSize: 12, color: W.textMid }}>Math verified. 0 errors. Institutional quality.</div></div>
            </div>
            <button onClick={onContinue} style={{ padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: W.green, color: "#fff", fontFamily: F.body, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" as const, width: m ? "100%" : "auto", justifyContent: "center", minHeight: 50, boxShadow: `0 4px 16px ${W.green}30` }}>View Your Report <ArrowR /></button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${W.accent}08`, border: `1px solid ${W.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 2s ease-in-out infinite" }}><Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" c={W.accent} s={12} /></div>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: W.text }}>Generating your report</span>
              <span style={{ fontFamily: F.body, fontSize: 11, color: W.textMid, marginLeft: "auto" }}>{phase}</span>
            </div>
            <div style={{ width: "100%", height: 4, borderRadius: 100, background: W.borderL, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${W.accent}, ${W.accentDark})`, width: `${progress}%`, transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
          </div>
        )}
      </div>

      {/* 1: MATH VERIFICATION */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 20%, ${W.bgAlt} 80%, ${W.bg} 100%)`, padding: `${m ? 44 : 72}px ${px}px` }}>
        <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 26 : 38, fontWeight: 500, color: W.text, margin: "0 0 12px" }}>Every number verified.<br /><span style={{ color: W.textSoft }}>Before it reaches your investors.</span></h3>
          <p style={{ fontFamily: F.body, fontSize: m ? 14 : 16, color: W.textSoft, lineHeight: 1.65, maxWidth: 460, margin: "0 auto 36px" }}>Three independent verification layers work in sequence. No number appears in your report unless all three agree.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 520, margin: "0 auto" }}>
            {[
              { title: "Source Tracing", desc: "Every value traced to the exact cell, row, and column in your T-12. If a number can't be sourced, it doesn't appear.", tag: "Your data is the only truth." },
              { title: "Formula Integrity", desc: "Fifteen registered CRE formulas — NOI, EGI, DSCR, expense ratios, per-unit metrics — validated against industry-standard calculations.", tag: "The same formulas your auditors use." },
              { title: "Arithmetic Certainty", desc: "A deterministic math engine re-computes every calculation. If the AI deviates by even a dollar, the engine overrides it.", tag: "AI proposes. Math decides." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: m ? 14 : 18, padding: m ? "20px 0" : "24px 0", borderBottom: i < 2 ? `1px solid ${W.borderL}` : "none", textAlign: "left" as const, opacity: sectionsRevealed > i ? 1 : 0, transform: sectionsRevealed > i ? "translateY(0)" : "translateY(12px)", filter: sectionsRevealed > i ? "blur(0)" : "blur(3px)", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
                <div style={{ width: m ? 44 : 50, height: m ? 44 : 50, borderRadius: 14, flexShrink: 0, background: sectionsRevealed > i ? W.greenBg : W.bgWarm, border: `1.5px solid ${sectionsRevealed > i ? W.green : W.border}20`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                  {sectionsRevealed > i ? <div style={{ animation: "checkPop 0.25s cubic-bezier(0.22,1,0.36,1) both" }}><Chk c={W.green} s={20} /></div> : <div style={{ width: 14, height: 14, borderRadius: "50%", background: W.borderL, animation: "breathe 1.5s ease-in-out infinite" }} />}
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: m ? 16 : 17, fontWeight: 700, color: W.text, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontFamily: F.body, fontSize: m ? 13 : 14, color: W.textMid, lineHeight: 1.6, marginBottom: 6 }}>{item.desc}</div>
                  <div style={{ fontFamily: F.display, fontSize: m ? 13 : 14, fontStyle: "italic", color: W.textSoft }}>{item.tag}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: m ? "16px" : "18px 22px", borderRadius: 14, background: sectionsRevealed > 3 ? W.greenBg : W.bgWarm, border: `1px solid ${sectionsRevealed > 3 ? W.green : W.border}20`, marginTop: 24, textAlign: "left" as const, maxWidth: 520, margin: "24px auto 0", opacity: sectionsRevealed > 3 ? 1 : 0.3, transition: "all 0.3s" }}>
            <div style={{ fontWeight: 600, color: sectionsRevealed > 3 ? W.green : W.textMuted, fontFamily: F.body, fontSize: 14, marginBottom: 4 }}>Full Audit Trail</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.5 }}>Every correction logged. Original value, corrected value, confidence level. Complete transparency.</div>
          </div>
        </div>
      </div>

      {/* 2: LINKEDIN REVIEWS MARQUEE */}
      <div style={{ background: W.bg, padding: `${m ? 40 : 64}px 0` }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: `0 ${px}px`, marginBottom: m ? 24 : 36 }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 24 : 34, fontWeight: 500, color: W.text, margin: "0 0 8px" }}>What firms like yours are saying</h3>
          <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textSoft }}>Real outcomes from real firms across the multifamily industry.</p>
        </div>
        <ReviewMarquee m={m} />
        <div style={{ textAlign: "center", marginTop: 14, fontFamily: F.body, fontSize: 10, color: W.textMuted, fontStyle: "italic", padding: `0 ${px}px` }}>Customer names and firm details anonymized for privacy. All outcomes are real and verified.</div>
      </div>

      {/* 3: WRITEUP INTELLIGENCE */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 15%, ${W.bgAlt} 85%, ${W.bg} 100%)`, padding: `${m ? 44 : 72}px ${px}px` }}>
        <IntelligenceAnimated m={m} t={t} />
      </div>

      {/* 4: PRICING */}
      <div style={{ background: W.bg, padding: `${m ? 44 : 72}px ${px}px` }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: m ? 28 : 44 }}>
            <h3 style={{ fontFamily: F.display, fontSize: m ? 26 : 38, fontWeight: 500, color: W.text, margin: "0 0 8px" }}>The right plan for your firm</h3>
            <p style={{ fontFamily: F.body, fontSize: m ? 13 : 15, color: W.textSoft, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>Same engine, same verification, same export quality. The difference is depth, customization, and team size.</p>
            <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, background: W.bgWarm, border: `1px solid ${W.borderL}` }}>
              {(["monthly", "quarterly", "yearly"] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{ padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: cycle === c ? 600 : 500, background: cycle === c ? W.bg : "transparent", color: cycle === c ? W.text : W.textMuted, border: "none", boxShadow: cycle === c ? "0 1px 4px rgba(0,0,0,0.06)" : "none", transition: "all 0.2s" }}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                  {DISC[c] > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: W.green }}>-{DISC[c]}%</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : t ? "1fr" : "1fr 1fr 1fr", gap: m ? 16 : 20, maxWidth: m ? 400 : "none", margin: m ? "0 auto" : undefined }}>
            {[
              { tier: "foundational", name: "Foundational", tag: "YOUR FREE REPORT", tagColor: W.gold, tagBg: W.goldBg, featured: false, desc: "Core reporting for smaller portfolios", items: ["4 report sections", "T-12 financial analysis", "KPI cards with MoM trends", "Proprietary math verification", "PDF, HTML & email-ready export", "1 user, up to 5 properties"] },
              { tier: "professional", name: "Professional", tag: "MOST POPULAR", tagColor: W.accent, tagBg: `${W.accent}10`, featured: true, desc: "Full-featured for growing firms", items: ["Everything in Foundational, plus:", "10 sections with inline charts", "Revenue waterfalls & expense bars", "Budget vs. actual variance", "Custom branding & section builder", "Report pipeline with approvals", "3 team members, 25 properties"] },
              { tier: "institutional", name: "Institutional", tag: "ENTERPRISE", tagColor: W.navy, tagBg: W.navyBg, featured: false, desc: "Institutional-grade LP reporting", items: ["Everything in Professional, plus:", "15 sections — full institutional depth", "Investment thesis tracking", "Lease expiration & rollover analysis", "Risk matrix & market intelligence", "10 team members, 100 properties"] },
            ].map((plan, i) => (
              <div key={i} className="gp-plan-card" style={{ background: W.bg, borderRadius: 18, padding: m ? 22 : 28, border: plan.featured ? `2px solid ${W.accent}40` : `1px solid ${W.borderL}`, boxShadow: plan.featured ? `0 8px 32px ${W.accent}10` : "0 2px 12px rgba(0,0,0,0.03)" }}>
                <span style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: plan.tagColor, background: plan.tagBg, padding: "3px 10px", borderRadius: 6, textTransform: "uppercase" as const, letterSpacing: "0.04em", border: `1px solid ${plan.tagColor}18` }}>{plan.tag}</span>
                <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.textMid, marginTop: 14, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}><span style={{ fontFamily: F.display, fontSize: m ? 36 : 40, fontWeight: 600, color: W.text }}>${perMo(plan.tier, cycle)}</span><span style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft }}>/property/mo</span></div>
                {DISC[cycle] > 0 && <div style={{ fontFamily: F.body, fontSize: 12, color: W.textMuted, marginBottom: 8 }}><span style={{ textDecoration: "line-through" }}>${PRICING[plan.tier].monthly}</span><span style={{ marginLeft: 6, color: W.green, fontWeight: 600 }}>Save {DISC[cycle]}%</span></div>}
                {DISC[cycle] === 0 && <div style={{ height: 8 }} />}
                <p style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.5, margin: "0 0 16px" }}>{plan.desc}</p>
                <div style={{ height: 1, background: W.borderL, marginBottom: 16 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{plan.items.map((item, j) => <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><div style={{ marginTop: 2, flexShrink: 0 }}><Chk c={plan.featured ? W.accent : W.green} s={14} /></div><span style={{ fontFamily: F.body, fontSize: 13, color: W.textMid, lineHeight: 1.4 }}>{item}</span></div>)}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontFamily: F.body, fontSize: 13, color: W.textMid }}>Not choosing now — let&apos;s finish your complimentary report first.</div>
        </div>
      </div>

      {/* 5: FEATURES */}
      <div style={{ background: `linear-gradient(to bottom, ${W.bg} 0%, ${W.bgAlt} 20%, ${W.bgAlt} 80%, ${W.bg} 100%)`, padding: `${m ? 44 : 68}px ${px}px` }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 24 : 34, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 28px" }}>What subscribers use every month</h3>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 12 }}>
            {[
              { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", t: "Upload budget once", d: "Automatic variance in every report." },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", t: "Set strategy once", d: "Track against your acquisition thesis." },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7", t: "Team workspace", d: "Roles, approvals, notifications." },
              { icon: "M5 12h14M12 5l7 7-7 7", t: "Report pipeline", d: "Draft, Review, Approve, Send, Archive." },
              { icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z", t: "Full section control", d: "Order, length, disclaimers." },
              { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", t: "Export anywhere", d: "PDF, HTML, or email-ready." },
            ].map((f, i) => (
              <div key={i} className="gp-card-lift" style={{ display: "flex", gap: 14, padding: "16px 18px", borderRadius: 14, background: W.bg, boxShadow: "0 1px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${W.accent}08`, border: `1px solid ${W.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic d={f.icon} c={W.accent} s={16} /></div>
                <div><div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: W.text, marginBottom: 2 }}>{f.t}</div><div style={{ fontFamily: F.body, fontSize: 13, color: W.textSoft, lineHeight: 1.5 }}>{f.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6: FAQ */}
      <div style={{ background: W.bg, padding: `${m ? 44 : 72}px ${px}px` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h3 style={{ fontFamily: F.display, fontSize: m ? 24 : 34, fontWeight: 500, color: W.text, textAlign: "center", margin: "0 0 24px" }}>Questions your team might have</h3>
          <FAQSection m={m} />
        </div>
      </div>
    </div>
  );
}
