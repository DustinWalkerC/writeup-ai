// ============================================================
// FILE: app/sign-in/[[...sign-in]]/page.tsx
// PURPOSE: Branded Clerk sign-in page with WriteUp AI identity
//          and data-security framing. Matches sign-up page.
// ============================================================

"use client";

import { SignIn } from "@clerk/nextjs";

const W = {
  accent: "#00B7DB",
  accentDark: "#0099B8",
  bg: "#FFFFFF",
  bgWarm: "#FAF9F7",
  text: "#1A1A1A",
  textMid: "#4A4A4A",
  textSoft: "#7A7A7A",
  textMuted: "#A3A3A3",
  border: "#E8E5E0",
  green: "#29581D",
  greenBg: "#F0F7ED",
};

const F = {
  display: "'Newsreader','Georgia',serif",
  body: "'DM Sans','Helvetica Neue',sans-serif",
};

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={W.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function SignInPage() {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: W.bgWarm,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 16px" : "48px 24px",
        fontFamily: F.body,
      }}
    >
      {/* Logo + Wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: "18px",
          }}
        >
          W
        </div>
        <span
          style={{
            fontFamily: F.display,
            fontSize: "22px",
            fontWeight: 600,
            color: W.text,
            letterSpacing: "-0.02em",
          }}
        >
          WriteUp AI
        </span>
      </div>

      {/* Context line */}
      <p
        style={{
          fontFamily: F.body,
          fontSize: "15px",
          color: W.textMid,
          textAlign: "center",
          maxWidth: "380px",
          lineHeight: 1.5,
          margin: "0 0 24px 0",
        }}
      >
        Sign in to access your reports, properties, and team workspace.
      </p>

      {/* Clerk SignIn component with branded appearance */}
      <SignIn
        appearance={{
          elements: {
            rootBox: {
              width: "100%",
              maxWidth: "420px",
            },
            card: {
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
              border: `1px solid ${W.border}`,
              borderRadius: "12px",
            },
            headerTitle: {
              fontFamily: F.display,
              color: W.text,
            },
            headerSubtitle: {
              fontFamily: F.body,
              color: W.textMid,
            },
            formButtonPrimary: {
              background: W.accent,
              fontFamily: F.body,
              fontWeight: 600,
              fontSize: "15px",
              borderRadius: "8px",
              textTransform: "none" as const,
              letterSpacing: "0",
              "&:hover": {
                background: W.accentDark,
              },
            },
            formFieldInput: {
              fontFamily: F.body,
              borderRadius: "8px",
              border: `1px solid ${W.border}`,
              fontSize: "15px",
            },
            footerActionLink: {
              color: W.accent,
              fontFamily: F.body,
            },
            socialButtonsBlockButton: {
              fontFamily: F.body,
              borderRadius: "8px",
              border: `1px solid ${W.border}`,
              fontSize: "14px",
            },
            dividerLine: {
              background: W.border,
            },
            dividerText: {
              fontFamily: F.body,
              color: W.textMuted,
              fontSize: "13px",
            },
          },
        }}
        forceRedirectUrl="/dashboard"
      />

      {/* Trust signal */}
      <div
        style={{
          marginTop: "24px",
          maxWidth: "380px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            background: W.greenBg,
            borderRadius: "8px",
            border: "1px solid #D4E8CE",
          }}
        >
          <ShieldIcon />
          <span
            style={{
              fontFamily: F.body,
              fontSize: "13px",
              color: W.green,
              fontWeight: 500,
            }}
          >
            Your financial data is encrypted and tenant-isolated
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <LockIcon />
        <span
          style={{
            fontFamily: F.body,
            fontSize: "12px",
            color: W.textMuted,
          }}
        >
          Secured by Clerk — enterprise-grade authentication
        </span>
      </div>
    </div>
  );
}
