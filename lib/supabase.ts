import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Property = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  units: number | null;
  created_at: string;
  updated_at: string;
};

export type Report = {
  id: string;
  property_id: string;
  user_id: string;
  month: string;
  year: number;
  status: string;
  content: Record<string, unknown>;
  financial_data: Record<string, unknown>;
  questionnaire: Record<string, unknown>;
  narrative: string | null;
  created_at: string;
  updated_at: string;
};
