"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// Add this helper function at the top
async function checkPropertySlots(
  userId: string
): Promise<{ canAdd: boolean; used: number; total: number }> {
  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("property_slots, status")
    .eq("user_id", userId)
    .single();

  // If the subscription row doesn't exist, treat as no slots.
  // (PGRST116 is "no rows" for .single())
  if (subError && subError.code !== "PGRST116") {
    throw subError;
  }

  // Get current property count
  const { count, error: countError } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  const used = count || 0;
  const total = subscription?.property_slots || 0;
  const isActive = subscription?.status === "active";

  return {
    canAdd: isActive && used < total,
    used,
    total,
  };
}

export async function getProperties() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProperty(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Check if user has available property slots
  const slots = await checkPropertySlots(userId);
  if (!slots.canAdd) {
    throw new Error(
      slots.total === 0
        ? "Please subscribe to a plan to add properties"
        : `You've used all ${slots.total} property slots. Please upgrade to add more.`
    );
  }

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const units = formData.get("units") as string;

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      name,
      address: address || null,
      city: city || null,
      state: state || null,
      units: units ? parseInt(units) : null,
      locked: true, // Lock the property name (requires these columns to exist)
      locked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/properties");
  return data;
}

export async function deleteProperty(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath("/dashboard/properties");
}
