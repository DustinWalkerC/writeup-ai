// app/api/free-report/generate/route.ts
// WriteUp AI — Free Report Generation Endpoint
// Creates property, uploads T-12, returns reportId for client-side generation trigger
// NOTE: tier is "professional" — the funnel promises Professional-level sections

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const FREE_SECTIONS = [
  "executive_summary",
  "occupancy_leasing",
  "revenue_analysis",
  "expense_analysis",
  "noi_performance",
];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if free report already used
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("free_report_used")
      .eq("user_id", userId)
      .maybeSingle();

    if (settings?.free_report_used) {
      return NextResponse.json({ error: "Free report already generated" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const propertyName = formData.get("propertyName") as string;
    const unitCount = formData.get("unitCount") as string;
    const address = formData.get("address") as string;
    const companyName = formData.get("companyName") as string;
    const preset = formData.get("preset") as string;
    const presetColors = JSON.parse(formData.get("presetColors") as string || "{}");
    const questionnaire = JSON.parse(formData.get("questionnaire") as string || "{}");
    const t12File = formData.get("t12") as File | null;
    const rentRollFile = formData.get("rentRoll") as File | null;
    const budgetFile = formData.get("budget") as File | null;

    // ── Report period from guided questions (defaults to previous month) ──
    const reportMonthStr = formData.get("reportMonth") as string;
    const reportYearStr = formData.get("reportYear") as string;
    const now = new Date();
    const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
    const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const selectedMonth = reportMonthStr ? parseInt(reportMonthStr, 10) : defaultMonth;
    const selectedYear = reportYearStr ? parseInt(reportYearStr, 10) : defaultYear;

    if (!propertyName || !unitCount || !t12File) {
      return NextResponse.json({ error: "Missing required fields: propertyName, unitCount, t12" }, { status: 400 });
    }

    // 1. Create property
    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .insert({
        user_id: userId,
        name: propertyName,
        units: parseInt(unitCount, 10),
        address: address || null,
      })
      .select("id")
      .single();

    if (propError || !property) {
      console.error("[FREE-REPORT] Property creation error:", propError);
      return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
    }

    // 2. Update user_settings with company name and colors
    await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          company_name: companyName || null,
          accent_color: presetColors.accent || "#d4a04a",
          secondary_color: presetColors.secondary || "#fefcf9",
          color_scheme: presetColors.primary || "#7b2d3b",
          free_report_used: true,
        },
        { onConflict: "user_id" }
      );

    // 3. Create report record — using user-selected month/year
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .insert({
        property_id: property.id,
        user_id: userId,
        month: selectedMonth,
        year: selectedYear,
        selected_month: selectedMonth,
        selected_year: selectedYear,
        status: "draft",
        pipeline_stage: "draft",
        questionnaire: questionnaire,
        distribution_status: questionnaire.distribution_status || null,
        generation_config: {
          tier: "professional",
          sections: FREE_SECTIONS,
          isFreeReport: true,
          presetIndex: parseInt(preset, 10),
          presetColors,
        },
      })
      .select("id")
      .single();

    if (reportError || !report) {
      console.error("[FREE-REPORT] Report creation error:", reportError);
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    // 4. Upload T-12 to storage
    const t12Buffer = await t12File.arrayBuffer();
    const t12Path = `${userId}/${report.id}/${t12File.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("report-files")
      .upload(t12Path, t12Buffer, {
        contentType: t12File.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[FREE-REPORT] T-12 upload error:", uploadError);
    }

    // Create report_files record for T-12
    await supabaseAdmin.from("report_files").insert({
      report_id: report.id,
      user_id: userId,
      file_name: t12File.name,
      file_type: "t12",
      file_size: t12File.size,
      storage_path: t12Path,
      processing_status: "pending",
    });

    // 5. Upload rent roll if provided
    if (rentRollFile) {
      const rrBuffer = await rentRollFile.arrayBuffer();
      const rrPath = `${userId}/${report.id}/${rentRollFile.name}`;

      const { error: rrUploadError } = await supabaseAdmin.storage
        .from("report-files")
        .upload(rrPath, rrBuffer, {
          contentType: rentRollFile.type,
          upsert: true,
        });

      if (!rrUploadError) {
        await supabaseAdmin.from("report_files").insert({
          report_id: report.id,
          user_id: userId,
          file_name: rentRollFile.name,
          file_type: "rent_roll",
          file_size: rentRollFile.size,
          storage_path: rrPath,
          processing_status: "pending",
        });
      }
    }

    // 5b. Upload budget if provided
    if (budgetFile) {
      const budgetBuffer = await budgetFile.arrayBuffer();
      const budgetPath = `${userId}/${report.id}/${budgetFile.name}`;

      const { error: budgetUploadError } = await supabaseAdmin.storage
        .from("report-files")
        .upload(budgetPath, budgetBuffer, {
          contentType: budgetFile.type,
          upsert: true,
        });

      if (!budgetUploadError) {
        await supabaseAdmin.from("report_files").insert({
          report_id: report.id,
          user_id: userId,
          file_name: budgetFile.name,
          file_type: "budget",
          file_size: budgetFile.size,
          storage_path: budgetPath,
          processing_status: "pending",
        });
      }
    }

    // 6. Mark free report tracking
    await supabaseAdmin
      .from("user_settings")
      .update({
        free_report_id: report.id,
        onboarding_completed_at: now.toISOString(),
      })
      .eq("user_id", userId);

    // Return the IDs — client will trigger generation via /api/reports/generate
    // using the same flow as the normal generate page
    // tier: "professional" ensures the prompt uses full analysis depth,
    // charts, and institutional-grade narrative for the 5 free sections
    return NextResponse.json({
      reportId: report.id,
      propertyId: property.id,
      selectedMonth,
      selectedYear,
      tier: "professional",
      questionnaire,
      status: "ready",
    });
  } catch (error) {
    console.error("[FREE-REPORT] Unhandled error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
