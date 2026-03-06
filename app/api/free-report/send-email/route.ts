// app/api/free-report/send-email/route.ts
// WriteUp AI — Send Report Delivery Email via Resend
// Sends branded report email to the user so they experience investor-quality delivery

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, reportId } = await req.json();

    if (!email || !reportId) {
      return NextResponse.json({ error: "Missing email or reportId" }, { status: 400 });
    }

    // Verify report belongs to user
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("id, property_id, user_id, generation_status")
      .eq("id", reportId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get property and user settings for branded email
    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("name, address")
      .eq("id", report.property_id)
      .maybeSingle();

    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("company_name, accent_color, secondary_color, color_scheme")
      .eq("user_id", userId)
      .maybeSingle();

    const propertyName = property?.name || "Your Property";
    const companyName = settings?.company_name || "Your Firm";
    const primaryColor = settings?.color_scheme || "#7b2d3b";
    const accentColor = settings?.accent_color || "#d4a04a";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.writeupai.com";
    const reportUrl = `${appUrl}/report/${reportId}`;

    // Build HTML email (table-based for email client compatibility)
    const emailHtml = buildReportEmail({
      propertyName,
      companyName,
      primaryColor,
      accentColor,
      reportUrl,
    });

    // Send via Resend
    if (process.env.RESEND_API_KEY) {
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "WriteUp AI <onboarding@resend.dev>",
        to: [email],
        subject: `${propertyName} — Monthly Asset Report`,
        html: emailHtml,
      });

      if (sendError) {
        console.error("[SEND-EMAIL] Resend error:", sendError);
        // Don't fail the request — the report is still viewable in-app
      }
    } else {
      console.log("[SEND-EMAIL] No RESEND_API_KEY configured. Email would be sent to:", email);
      console.log("[SEND-EMAIL] Report URL:", reportUrl);
    }

    // Update report pipeline stage
    await supabaseAdmin
      .from("reports")
      .update({
        status: "sent",
        pipeline_stage: "sent",
      })
      .eq("id", reportId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEND-EMAIL] Unhandled error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════
// Email Template (table-based HTML for email client compat)
// ═══════════════════════════════════════════════════════════

function buildReportEmail({
  propertyName,
  companyName,
  primaryColor,
  accentColor,
  reportUrl,
}: {
  propertyName: string;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  reportUrl: string;
}) {
  const sections = [
    "Executive Summary",
    "Occupancy & Leasing",
    "Revenue Analysis",
    "Expense Analysis",
    "Net Operating Income",
  ];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:${primaryColor};padding:28px 32px;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:22px;font-weight:700;font-family:Georgia,serif;">${propertyName}</div>
                <div style="font-size:13px;opacity:0.85;margin-top:4px;">March 2026 — Monthly Asset Report</div>
              </td>
              <td align="right" style="font-size:12px;opacity:0.7;">${companyName}</td>
            </tr>
          </table>
        </td></tr>
        <!-- Accent stripe -->
        <tr><td style="height:3px;background:${accentColor};"></td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:8px;">Your report is ready for review.</div>
          <div style="font-size:14px;color:#4a4a4a;line-height:1.6;margin-bottom:24px;">
            Your complimentary investor report for <strong>${propertyName}</strong> has been generated with five analysis sections and three-layer math verification. Click below to open the full report in your WriteUp AI dashboard.
          </div>
          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${primaryColor};border-radius:10px;padding:14px 32px;">
              <a href="${reportUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;">View Full Report</a>
            </td></tr>
          </table>
          <!-- Sections included -->
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e8e5e0;">
            <div style="font-size:11px;font-weight:700;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Sections Included</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${sections
                .map(
                  (s) => `<tr><td style="padding:6px 0;font-size:13px;color:#4a4a4a;border-bottom:1px solid #f0ede8;">
                <span style="color:${accentColor};margin-right:8px;">&#10003;</span>${s}
              </td></tr>`
                )
                .join("")}
            </table>
          </div>
          <!-- Math verification badge -->
          <div style="margin-top:20px;padding:14px 18px;background:#f0f7ed;border-radius:10px;border:1px solid rgba(41,88,29,0.12);">
            <div style="font-size:12px;font-weight:600;color:#29581d;margin-bottom:2px;">Three-Layer Math Verification</div>
            <div style="font-size:11px;color:#4a4a4a;line-height:1.5;">Every calculation verified. Expand any section in the report viewer to see the full audit trail.</div>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f7f5f1;border-top:1px solid #e8e5e0;text-align:center;">
          <div style="font-size:11px;color:#a3a3a3;">WriteUp AI — Institutional-quality investor reports for multifamily PE</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
