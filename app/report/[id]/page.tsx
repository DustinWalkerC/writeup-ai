// app/report/[id]/page.tsx
// WriteUp AI — Public Report Viewer
// No auth required. Used for "View Full Report" links from email delivery.
// Fetches report with service role key, renders professional HTML.

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Section {
  id: string;
  title: string;
  content: string;
  chart_html?: string;
  metrics?: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>;
  included: boolean;
}

export default async function PublicReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return <ErrorPage message="Report viewer is temporarily unavailable." />;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch report
  const { data: report } = await supabase
    .from("reports")
    .select("id, property_id, user_id, selected_month, selected_year, generated_sections, generation_status, generation_config")
    .eq("id", id)
    .maybeSingle();

  if (!report || !report.generated_sections || report.generated_sections.length === 0) {
    notFound();
  }

  // Fetch property
  const { data: property } = await supabase
    .from("properties")
    .select("name, address, units")
    .eq("id", report.property_id)
    .maybeSingle();

  // Fetch brand settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("company_name, accent_color, secondary_color, color_scheme")
    .eq("user_id", report.user_id)
    .maybeSingle();

  const propertyName = property?.name || "Property Report";
  const propertyAddress = property?.address || "";
  const unitCount = property?.units || null;
  const companyName = settings?.company_name || "";
  const primaryColor = settings?.color_scheme || "#7b2d3b";
  const accentColor = settings?.accent_color || "#d4a04a";
  const secondaryColor = settings?.secondary_color || "#fefcf9";
  const monthName = MONTH_NAMES[(report.selected_month || 1) - 1];
  const year = report.selected_year || new Date().getFullYear();

  const sections: Section[] = (report.generated_sections || []).filter((s: Section) => s.included !== false);

  // Extract top-level KPIs from executive summary metrics (first section)
  const headerKPIs = sections[0]?.metrics?.slice(0, 6) || [];

  // Derive location string from address (city, state)
  const locationParts = propertyAddress.split(",").map((s: string) => s.trim());
  const locationShort = locationParts.length >= 2
    ? `${locationParts[locationParts.length - 2]}, ${locationParts[locationParts.length - 1]}`
    : propertyAddress;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F1", fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      {/* Minimal top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8E5E0", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#00B7DB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, color: "#fff" }}>W</div>
          <span style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>WriteUp AI</span>
        </div>
        <a href="https://app.writeupai.com/dashboard/pricing" style={{
          padding: "8px 18px", borderRadius: 8, background: "#00B7DB", color: "#fff", textDecoration: "none",
          fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600,
        }}>Get WriteUp AI</a>
      </div>

      {/* Report container */}
      <div style={{ maxWidth: 816, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E8E5E0" }}>

          {/* ═══ INSTITUTIONAL HEADER ═══ */}
          <div style={{ background: primaryColor, padding: "24px 32px 20px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              {/* Left: company + property name + units */}
              <div style={{ flex: 1 }}>
                {companyName && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.7, marginBottom: 6 }}>
                    {companyName}
                  </div>
                )}
                <div style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                  {propertyName}{unitCount ? ` · ${unitCount} Units` : ""}
                </div>
              </div>
              {/* Right: date + location */}
              <div style={{ textAlign: "right" as const, flexShrink: 0, marginLeft: 24 }}>
                <div style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
                  {monthName} {year}
                </div>
                {locationShort && (
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                    {locationShort}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Accent stripe */}
          <div style={{ height: 3, background: accentColor }} />

          {/* ═══ FULL-WIDTH KPI BAR ═══ */}
          {headerKPIs.length > 0 && (
            <div style={{ display: "flex", background: secondaryColor, borderBottom: "1px solid #E8E5E0" }}>
              {headerKPIs.map((m, i) => (
                <div key={i} style={{
                  flex: 1, padding: "16px 8px", textAlign: "center" as const,
                  borderRight: i < headerKPIs.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#7A7A7A", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 20, fontWeight: 700, color: primaryColor, fontVariantNumeric: "tabular-nums" }}>
                    {m.value}
                  </div>
                  {m.change && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, marginTop: 3,
                      color: m.changeDirection === "up" ? "#29581D" : m.changeDirection === "down" ? "#CC0000" : "#7A7A7A",
                    }}>
                      {m.changeDirection === "up" ? "\u25B2" : m.changeDirection === "down" ? "\u25BC" : ""}{" "}
                      {m.change}{!m.change.includes("MoM") && !m.change.includes("bps") ? " MoM" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ REPORT SECTIONS ═══ */}
          <div style={{ padding: "28px 36px" }}>
            {sections.map((section, idx) => (
              <div key={section.id} style={{ marginBottom: idx < sections.length - 1 ? 32 : 0, paddingBottom: idx < sections.length - 1 ? 32 : 0, borderBottom: idx < sections.length - 1 ? "1px solid #F0EDE8" : "none" }}>
                {/* Section title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 20, background: accentColor, borderRadius: 2 }} />
                  <h2 style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 19, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>{section.title}</h2>
                </div>

                {/* Section metrics — full width, skip for first section since header KPI bar handles it */}
                {idx > 0 && section.metrics && section.metrics.length > 0 && (
                  <div style={{ display: "flex", gap: 0, marginBottom: 16, border: "1px solid #E8E5E0", borderRadius: 10, overflow: "hidden" }}>
                    {section.metrics.map((m, mi) => (
                      <div key={mi} style={{
                        flex: 1, padding: "12px 8px", textAlign: "center" as const, background: "#F7F5F1",
                        borderRight: mi < section.metrics!.length - 1 ? "1px solid #E8E5E0" : "none",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#7A7A7A", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 2 }}>
                          {m.label}
                        </div>
                        <div style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 17, fontWeight: 700, color: primaryColor, fontVariantNumeric: "tabular-nums" }}>
                          {m.value}
                        </div>
                        {m.change && (
                          <div style={{
                            fontSize: 9, fontWeight: 600, marginTop: 2,
                            color: m.changeDirection === "up" ? "#29581D" : m.changeDirection === "down" ? "#CC0000" : "#7A7A7A",
                          }}>
                            {m.change}{!m.change.includes("MoM") && !m.change.includes("bps") ? " MoM" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Section narrative */}
                {section.content && (
                  <div
                    style={{ fontSize: 14, color: "#4A4A4A", lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: renderNarrative(section.content) }}
                  />
                )}

                {/* Section chart */}
                {section.chart_html && (
                  <div style={{ marginTop: 16, width: "100%", maxWidth: "100%", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: section.chart_html }} />
                )}
              </div>
            ))}
          </div>

          {/* Math verification badge */}
          <div style={{ margin: "0 36px 24px", padding: "14px 18px", background: "#F0F7ED", borderRadius: 10, border: "1px solid rgba(41,88,29,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#29581D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#29581D" }}>Three-Layer Math Verification</div>
              <div style={{ fontSize: 11, color: "#4A4A4A" }}>Every calculation in this report has been independently verified.</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 36px", background: "#F7F5F1", borderTop: "1px solid #E8E5E0", textAlign: "center" as const }}>
            <div style={{ fontSize: 11, color: "#A3A3A3" }}>Generated by WriteUp AI — Institutional-quality investor reports for multifamily PE</div>
          </div>
        </div>

        {/* CTA banner below report */}
        <div style={{ marginTop: 20, padding: "24px 28px", borderRadius: 14, background: "#fff", border: "1px solid #E8E5E0", textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily: "'Newsreader','Georgia',serif", fontSize: 20, fontWeight: 500, color: "#1A1A1A", marginBottom: 6 }}>Want reports like this for your portfolio?</div>
          <div style={{ fontSize: 13, color: "#7A7A7A", marginBottom: 16, lineHeight: 1.5 }}>Generate institutional-quality investor reports in under 5 minutes. Every plan includes three-layer math verification and a live onboarding session.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" as const }}>
            <a href="https://app.writeupai.com/dashboard/pricing" style={{
              padding: "12px 28px", borderRadius: 10, background: "#00B7DB", color: "#fff", textDecoration: "none",
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(0,183,219,0.2)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              Explore Plans
            </a>
            <a href="https://calendly.com/yourpropertyoffers/writeup-ai-platform-walkthrough" target="_blank" rel="noopener noreferrer" style={{
              padding: "12px 28px", borderRadius: 10, background: "#fff", color: "#002D5F", textDecoration: "none",
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8,
              border: "1px solid rgba(0,45,95,0.2)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#002D5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Book a Demo
            </a>
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// Render narrative text (markdown → HTML)
function renderNarrative(content: string): string {
  if (!content) return "";
  let html = content.replace(/\\n/g, "\n");

  // If content already has HTML blocks, separate them
  const hasInlineHTML = /<(?:div|table|svg|style)\b/i.test(html);
  if (hasInlineHTML) {
    const parts = html.split(/(<(?:div|table|svg|style)[\s\S]*?<\/(?:div|table|svg|style)>)/gi);
    return parts
      .map((part) => {
        if (/^<(?:div|table|svg|style)/i.test(part.trim())) return "";
        return convertText(part);
      })
      .join("");
  }
  return convertText(html);
}

function convertText(text: string): string {
  if (!text.trim()) return "";
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.7;">')
    .replace(/\n/g, "<br/>")
    .replace(/^(.+)/, '<p style="margin:8px 0;line-height:1.7;">$1')
    .replace(/(.+)$/, "$1</p>");
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}>Report Unavailable</div>
        <div style={{ fontSize: 14, color: "#7A7A7A" }}>{message}</div>
      </div>
    </div>
  );
}
