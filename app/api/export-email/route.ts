// ═══════════════════════════════════════════════════════════════
// app/api/export-email/route.ts
// Orchestrates the full email export pipeline using existing
// server actions for data access (respects RLS + auth).
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getReport } from '@/app/actions/reports';
import { getUserSettings } from '@/app/actions/settings';
import { renderEmailHTML, type ReportData, type ChartImageMap } from '@/lib/email-renderer';

// ─────────────────────────────────────────────────────────────
// POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    // ── Fetch report using existing server action (handles RLS + auth) ──
    let report;
    try {
      report = await getReport(reportId);
    } catch (err) {
      console.error('[export-email] getReport failed:', err);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // ── Fetch user settings using existing server action ──
    const settings = await getUserSettings();

    // ── Parse generated sections ──
    const reportAny = report as Record<string, unknown>;
    const sections = Array.isArray(reportAny.generated_sections)
      ? (reportAny.generated_sections as Array<{ id: string; title: string; content: string; chart_html?: string; metrics?: Array<{ label: string; value: string; change?: string; direction?: string }>; included: boolean }>)
      : [];

    // ── Chart images: skip for now, we'll add the pipeline later ──
    const chartImages: ChartImageMap = {};

    // ── Build report data for template ──
    const property = report.property;
    const reportData: ReportData = {
      property_name: property?.name || 'Property Report',
      unit_count: property?.units || '',
      reporting_period: `${report.month} ${report.year}`,
      property_location: property?.city && property?.state
        ? `${property.city}, ${property.state}`
        : property?.address || '',
      property_class: 'Multifamily',
      company_name: settings?.company_name || 'Investment Group',
      company_logo_url: settings?.company_logo_url || undefined,
      disclaimer_text: settings?.custom_disclaimer || undefined,
      primary_color: settings?.accent_color || '#002D5F',
      accent_color: settings?.secondary_color || '#CC0000',
      green_color: '#008A3E',
      red_color: '#CC0000',
    };

    // ── Render MJML → HTML ──
    const result = await renderEmailHTML({
      report: reportData,
      sections: sections as any,
      chartImages,
    });

    // ── Log any MJML warnings ──
    if (result.errors.length > 0) {
      console.warn('[export-email] MJML warnings:', result.errors);
    }

    // ── Return compiled HTML ──
    return NextResponse.json({
      html: result.html,
      estimatedSizeKB: result.estimatedSizeKB,
      chartCount: 0,
      sectionCount: sections.filter((s) => s.included).length,
      warnings: result.errors.map(e => e.message),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[export-email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email export', details: message },
      { status: 500 }
    );
  }
}

