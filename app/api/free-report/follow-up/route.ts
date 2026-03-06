// app/api/free-report/follow-up/route.ts
// WriteUp AI — Post-Report Follow-Up Email
// Sends demo-focused email after free report delivery
// Called from send-email route after a delay, or triggered via cron

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CALENDLY_URL = "https://calendly.com/yourpropertyoffers/writeup-ai-platform-walkthrough";

export async function POST(req: Request) {
  try {
    const { userId, reportId, email, propertyName, emailNumber } = await req.json();

    if (!email || !reportId) {
      return NextResponse.json({ error: "Missing email or reportId" }, { status: 400 });
    }

    // Pick the right email template
    const template = getFollowUpTemplate(emailNumber || 1, propertyName || "your property", CALENDLY_URL);

    if (process.env.RESEND_API_KEY) {
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "WriteUp AI <onboarding@resend.dev>",
        to: [email],
        subject: template.subject,
        html: template.html,
      });

      if (sendError) {
        console.error("[FOLLOW-UP] Resend error:", sendError);
      }
    } else {
      console.log("[FOLLOW-UP] No RESEND_API_KEY. Would send:", template.subject, "to:", email);
    }

    return NextResponse.json({ success: true, emailNumber: emailNumber || 1 });
  } catch (error) {
    console.error("[FOLLOW-UP] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════
// Email Templates — 4-email demo-push sequence
// ═══════════════════════════════════════════════════════════

function getFollowUpTemplate(emailNumber: number, propertyName: string, calendlyUrl: string) {
  const baseStyle = `font-family:'Helvetica Neue',Arial,sans-serif;`;
  const accentColor = "#00B7DB";
  const textColor = "#1A1A1A";
  const softColor = "#4A4A4A";
  const mutedColor = "#7A7A7A";

  const wrapEmail = (subject: string, bodyContent: string) => ({
    subject,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;${baseStyle}background:#f5f5f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="padding:28px 32px;">
          ${bodyContent}
        </td></tr>
        <tr><td style="padding:14px 32px;background:#F7F5F1;border-top:1px solid #E8E5E0;text-align:center;">
          <div style="font-size:11px;color:#A3A3A3;">WriteUp AI — Institutional-quality investor reports</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  switch (emailNumber) {
    // ── Email 1: Sent 2 minutes after report delivery ──
    case 1:
      return wrapEmail(
        `Your ${propertyName} report — what comes next`,
        `
          <div style="font-size:18px;font-weight:700;color:${textColor};margin-bottom:12px;font-family:Georgia,serif;">
            You've seen what WriteUp AI can do with your data.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            The report you just received was generated with 5 analysis sections and three-layer math verification — in under 2 minutes.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            But that was just a preview. In a 25-minute walkthrough, I'll show you:
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:4px 0;font-size:13px;color:${softColor};"><span style="color:${accentColor};margin-right:8px;">&#10003;</span> How to generate your full 10-section Professional report with charts</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:${softColor};"><span style="color:${accentColor};margin-right:8px;">&#10003;</span> Budget vs. actual variance tracking that catches what manual processes miss</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:${softColor};"><span style="color:${accentColor};margin-right:8px;">&#10003;</span> How to go from upload to investor-ready report in under 5 minutes</td></tr>
          </table>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:20px;">
            Bring a T-12 for any property — I'll generate a full report live on the call so you can see exactly what your investors would receive.
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${accentColor};border-radius:10px;padding:14px 32px;">
              <a href="${calendlyUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Book Your Walkthrough</a>
            </td></tr>
          </table>
          <div style="margin-top:20px;font-size:12px;color:${mutedColor};text-align:center;">
            25 minutes. No commitment. Just clarity on what's possible.
          </div>
        `
      );

    // ── Email 2: Sent 2 days after report delivery ──
    case 2:
      return wrapEmail(
        `The reporting gap most firms don't see`,
        `
          <div style="font-size:18px;font-weight:700;color:${textColor};margin-bottom:12px;font-family:Georgia,serif;">
            Your investors are comparing you to every other GP they work with.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            The firms winning re-ups aren't just delivering returns — they're delivering institutional-quality reporting that builds trust month over month.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            In your walkthrough, I'll show you how to:
          </div>
          <div style="padding:16px 20px;border-radius:10px;background:#F7F5F1;border:1px solid #E8E5E0;margin-bottom:20px;">
            <div style="font-size:13px;color:${softColor};line-height:1.8;">
              <strong style="color:${textColor};">Identify NOI leakage</strong> your current process misses<br/>
              <strong style="color:${textColor};">Automate budget variance tracking</strong> so nothing slips through<br/>
              <strong style="color:${textColor};">Deliver reports your LPs will actually read</strong> — not just file
            </div>
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:20px;">
            This isn't a sales pitch. It's a working session with your actual data.
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${accentColor};border-radius:10px;padding:14px 32px;">
              <a href="${calendlyUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Book Your Walkthrough</a>
            </td></tr>
          </table>
        `
      );

    // ── Email 3: Sent 4 days after report delivery ──
    case 3:
      return wrapEmail(
        `"We caught a $40K variance in the first month"`,
        `
          <div style="font-size:18px;font-weight:700;color:${textColor};margin-bottom:12px;font-family:Georgia,serif;">
            Here's what firms like yours are experiencing.
          </div>
          <div style="padding:16px 20px;border-radius:10px;background:#F7F5F1;border-left:3px solid ${accentColor};margin-bottom:16px;">
            <div style="font-size:14px;color:${softColor};line-height:1.7;font-style:italic;margin-bottom:8px;">
              "We switched from manual Excel reports and caught a $40K insurance variance in the first month. The math verification alone paid for the platform."
            </div>
            <div style="font-size:12px;font-weight:600;color:${textColor};">VP of Asset Management — 8-property value-add fund</div>
          </div>
          <div style="padding:16px 20px;border-radius:10px;background:#F7F5F1;border-left:3px solid ${accentColor};margin-bottom:20px;">
            <div style="font-size:14px;color:${softColor};line-height:1.7;font-style:italic;margin-bottom:8px;">
              "Our investors started commenting on how professional our reports look. That's never happened in 12 years of reporting."
            </div>
            <div style="font-size:12px;font-weight:600;color:${textColor};">Managing Partner — 22-property portfolio</div>
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:20px;">
            In 25 minutes, I'll show you exactly how these firms set up their reporting — using your own data.
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${accentColor};border-radius:10px;padding:14px 32px;">
              <a href="${calendlyUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Book Your Walkthrough</a>
            </td></tr>
          </table>
        `
      );

    // ── Email 4: Sent 7 days after report delivery ──
    case 4:
    default:
      return wrapEmail(
        `Final note — your report data expires soon`,
        `
          <div style="font-size:18px;font-weight:700;color:${textColor};margin-bottom:12px;font-family:Georgia,serif;">
            Your ${propertyName} data is still on file.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            The T-12 you uploaded and the report we generated are stored securely — but complimentary report data is archived after 30 days.
          </div>
          <div style="font-size:14px;color:${softColor};line-height:1.7;margin-bottom:16px;">
            If you'd like to see what a full Professional report looks like with your data — charts, rent roll analysis, budget variance, and 10 analysis sections — I have a few walkthrough spots left this week.
          </div>
          <div style="padding:14px 18px;background:#FBF8EF;border-radius:10px;border:1px solid rgba(184,150,15,0.15);margin-bottom:20px;">
            <div style="font-size:13px;color:#846A10;line-height:1.6;">
              <strong>What you'll walk away with:</strong> A live-generated Professional report for your property, a clear understanding of the platform, and a personalized recommendation for your portfolio.
            </div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${accentColor};border-radius:10px;padding:14px 32px;">
              <a href="${calendlyUrl}" style="color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Book Before Spots Fill</a>
            </td></tr>
          </table>
          <div style="margin-top:20px;font-size:12px;color:${mutedColor};text-align:center;">
            If timing doesn't work right now, no pressure. Your complimentary report is always accessible from your dashboard.
          </div>
        `
      );
  }
}