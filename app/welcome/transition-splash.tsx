// app/welcome/transition-splash.tsx
// WriteUp AI — Funnel Transition Splashes
// RGB text reveal splashes between funnel screens. Auto-advance.
// Used by welcome-client.tsx and guided-questions.tsx

"use client";

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// Design Tokens (must match welcome-client.tsx)
// ═══════════════════════════════════════════════════════════
const W = {
  accent: "#00B7DB",
  bg: "#FFFFFF",
  text: "#1A1A1A",
  textSoft: "#7A7A7A",
  green: "#29581D",
  greenBg: "#F0F7ED",
};
const F = {
  display: "'Newsreader','Georgia',serif",
  body: "'DM Sans','Helvetica Neue',sans-serif",
};

// ═══════════════════════════════════════════════════════════
// RGB Gradient (same as guided-questions.tsx / generating-page.tsx)
// ═══════════════════════════════════════════════════════════
function makeRevealGradient(c: string): string {
  return `linear-gradient(135deg, ${c} 0%, ${c} 30%, #C97B84 36%, #D4A84C 42%, #7ABFBF 48%, #B09ED8 54%, #8DB98D 60%, transparent 66%, transparent 100%)`;
}

// ═══════════════════════════════════════════════════════════
// Splash Configuration — Final Copy & Timing
// ═══════════════════════════════════════════════════════════
export interface SplashConfig {
  id: string;
  headline: string;
  subtitle: string;
  durationMs: number;
  hasIcon?: boolean;
  isConfirmation?: boolean;
}

export const SPLASH_CONFIG: Record<string, SplashConfig> = {
  opening: {
    id: "opening",
    headline: "Let\u2019s build your first investor report",
    subtitle:
      "Your team is about to produce institutional-quality reports at superhuman speed. The same reporting standard used by JLL, CBRE, and Cushman & Wakefield \u2014 built from your actual financials in minutes.",
    durationMs: 15500,
    hasIcon: true,
  },
  sections: {
    id: "sections",
    headline: "Your investors are about to see a different kind of report",
    subtitle:
      "We\u2019re giving you five institutional-quality sections \u2014 every number verified before it reaches your LPs. For free. Click any section to see exactly what it analyzes for you.",
    durationMs: 15800,
  },
  upload: {
    id: "upload",
    headline: "Let\u2019s set up your property",
    subtitle:
      "Choose from our beautiful template colors, then enter your property details and upload your T-12. Everything on this page shapes the report your investors receive.",
    durationMs: 12000,
  },
  questions: {
    id: "questions",
    headline: "Last step before we build",
    subtitle:
      "A few quick questions so your report reads like your team wrote it \u2014 occupancy updates, move-ins, financial changes, asset manager notes. The context that turns data into exceptional narrative.",
    durationMs: 13800,
  },
  generating: {
    id: "generating",
    headline: "Everything received. Your report is being built.",
    subtitle:
      "Your files, your notes, your context \u2014 all in our secured & encrypted database. Three-layer math verification is running now. Every number traced, every formula checked.",
    durationMs: 13900,
    isConfirmation: true,
  },
};

// ═══════════════════════════════════════════════════════════
// TransitionSplash Component
// ═══════════════════════════════════════════════════════════
// Renders a full-screen overlay with RGB text reveal.
// Auto-dismisses after durationMs and calls onComplete.
// position: fixed — renders on top of everything.

interface TransitionSplashProps {
  splash: SplashConfig;
  onComplete: () => void;
  m: boolean;
}

export default function TransitionSplash({ splash, onComplete, m }: TransitionSplashProps) {
  const { headline, subtitle, durationMs, hasIcon, isConfirmation } = splash;
  const [swept, setSwept] = useState(false);
  const [fading, setFading] = useState(false);

  const revealMs = hasIcon ? 400 : 250;
  const fadeMs = durationMs - 700;

  useEffect(() => {
    const t1 = setTimeout(() => setSwept(true), revealMs);
    const t2 = setTimeout(() => setFading(true), fadeMs);
    const t3 = setTimeout(() => onComplete(), durationMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete, durationMs, revealMs, fadeMs]);

  const headlineColor = isConfirmation ? W.green : W.text;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: W.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: m ? "0 28px" : "0 48px",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Confirmation checkmark */}
      {isConfirmation && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: W.greenBg,
            border: `1px solid ${W.green}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            opacity: swept ? 1 : 0,
            transform: swept ? "scale(1)" : "scale(0.7)",
            transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={W.green}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Opening logo mark */}
      {hasIcon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: W.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            opacity: swept ? 1 : 0,
            transform: swept ? "scale(1)" : "scale(0.8)",
            transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            style={{
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
            }}
          >
            W
          </span>
        </div>
      )}

      {/* Headline — RGB text reveal */}
      <h2
        style={{
          background: makeRevealGradient(headlineColor),
          backgroundSize: "350% 350%",
          backgroundPosition: swept ? "0% 0%" : "100% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          transition: swept
            ? "background-position 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "background-position 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19)",
          fontFamily: F.display,
          fontSize: m ? 26 : 34,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          margin: "0 0 14px",
          maxWidth: 500,
        }}
      >
        {headline}
      </h2>

      {/* Subtitle — staggered RGB reveal */}
      <p
        style={{
          background: makeRevealGradient(W.textSoft),
          backgroundSize: "350% 350%",
          backgroundPosition: swept ? "0% 0%" : "100% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          transition: swept
            ? "background-position 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s"
            : "background-position 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19)",
          fontFamily: F.body,
          fontSize: m ? 14 : 16,
          textAlign: "center",
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 440,
        }}
      >
        {subtitle}
      </p>

      {/* Confirmation security tag */}
      {isConfirmation && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 20,
            opacity: swept ? 1 : 0,
            transition: "opacity 0.5s ease 0.8s",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={W.green}
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span
            style={{
              fontFamily: F.body,
              fontSize: 11,
              fontWeight: 600,
              color: W.green,
            }}
          >
            Encrypted. Verified. Yours.
          </span>
        </div>
      )}
    </div>
  );
}
