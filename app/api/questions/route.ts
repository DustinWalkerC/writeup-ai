import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * GET /api/questions
 * Fetches active question templates ordered by sort_order.
 * No auth required — question templates are public/global.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("question_templates")
      .select("id, sort_order, section_key, section_label, section_icon, question_key, title, subtitle, hint, input_type, placeholder, options, min_tier, is_required")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[API] Failed to fetch question templates:", error.message);
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    // Parse options from JSONB string if needed
    const questions = (data || []).map(q => ({
      ...q,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[API] Question templates error:", err);
    return NextResponse.json({ questions: [] }, { status: 200 });
  }
}