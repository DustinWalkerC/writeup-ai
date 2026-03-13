import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/questionnaire
 * Saves guided question responses for a property/report.
 * 
 * Body:
 * {
 *   property_id: string,
 *   report_id: string | null,
 *   responses: Record<string, string | number>,
 *   questions_shown: number,
 *   questions_answered: number,
 *   time_spent_seconds: number
 * }
 * 
 * Also updates the reports.questionnaire JSONB column if report_id is provided,
 * and updates reports.distribution_status from the responses.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      property_id,
      report_id,
      responses,
      questions_shown,
      questions_answered,
      time_spent_seconds,
    } = body;

    if (!property_id) {
      return NextResponse.json({ error: "property_id is required" }, { status: 400 });
    }

    // 1. Save to questionnaire_responses table
    const { data: qr, error: qrError } = await supabase
      .from("questionnaire_responses")
      .upsert(
        {
          property_id,
          report_id: report_id || null,
          user_id: userId,
          responses,
          questions_shown: questions_shown || 0,
          questions_answered: questions_answered || 0,
          time_spent_seconds: time_spent_seconds || null,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "report_id",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (qrError) {
      // If upsert on report_id fails (e.g., no report yet), do a plain insert
      const { error: insertError } = await supabase
        .from("questionnaire_responses")
        .insert({
          property_id,
          report_id: report_id || null,
          user_id: userId,
          responses,
          questions_shown: questions_shown || 0,
          questions_answered: questions_answered || 0,
          time_spent_seconds: time_spent_seconds || null,
          completed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[API] Failed to save questionnaire responses:", insertError.message);
        // Don't fail the request — responses are also synced to reports table below
      }
    }

    // 2. If report exists, sync responses to reports.questionnaire JSONB
    if (report_id) {
      const updateData: Record<string, unknown> = {
        questionnaire: responses,
      };

      // Extract distribution_status if present
      if (responses?.distribution) {
        updateData.distribution_status = responses.distribution;
      }

      const { error: reportError } = await supabase
        .from("reports")
        .update(updateData)
        .eq("id", report_id);

      if (reportError) {
        console.error("[API] Failed to sync questionnaire to report:", reportError.message);
      }
    }

    return NextResponse.json({
      success: true,
      response_id: qr?.id || null,
    });
  } catch (err) {
    console.error("[API] Questionnaire save error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/questionnaire?property_id=xxx&report_id=yyy
 * Fetches existing questionnaire responses (for resuming)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("property_id");
    const reportId = searchParams.get("report_id");

    if (!propertyId && !reportId) {
      return NextResponse.json({ error: "property_id or report_id required" }, { status: 400 });
    }

    let query = supabase
      .from("questionnaire_responses")
      .select("responses, questions_answered, completed_at")
      .eq("user_id", userId);

    if (reportId) {
      query = query.eq("report_id", reportId);
    } else if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ responses: null });
    }

    return NextResponse.json({
      responses: data.responses,
      questions_answered: data.questions_answered,
      completed_at: data.completed_at,
    });
  } catch (err) {
    console.error("[API] Questionnaire fetch error:", err);
    return NextResponse.json({ responses: null });
  }
}