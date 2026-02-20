"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { FREE_PROPERTY_LIMIT } from "@/lib/pricing-config";

async function checkPropertySlots(
  userId: string
): Promise<{ canAdd: boolean; used: number; total: number }> {
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("property_slots, status")
    .eq("user_id", userId)
    .single();

  if (subError && subError.code !== "PGRST116") {
    throw subError;
  }

  const { count, error: countError } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  const used = count || 0;
  const hasSubscription = subscription?.status === "active";
  const total = hasSubscription
    ? subscription?.property_slots || 0
    : FREE_PROPERTY_LIMIT;

  return {
    canAdd: used < total,
    used,
    total,
  };
}

export async function getPropertySlots() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return checkPropertySlots(userId);
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

  const slots = await checkPropertySlots(userId);
  if (!slots.canAdd) {
    throw new Error(
      `You've used all ${slots.total} property slots. Please upgrade your plan to add more.`
    );
  }

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const units = formData.get("units") as string;
  const investmentStrategy = formData.get("investment_strategy") as string;

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      name,
      address: address || null,
      city: city || null,
      state: state || null,
      units: units ? parseInt(units) : null,
      investment_strategy: investmentStrategy || null,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/properties");
  return data;
}

export async function updateProperty(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const newName = formData.get("name") as string;

  // ── Fraud Prevention: Lock property name after first report ──
  const { data: property } = await supabase
    .from("properties")
    .select("name")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (property && newName !== property.name) {
    const { count: reportCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id)
      .eq("user_id", userId);

    if (reportCount && reportCount > 0) {
      throw new Error(
        "Property name cannot be changed after reports have been generated. This prevents report identity fraud. Contact support if you need to rename a property."
      );
    }
  }

  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const units = formData.get("units") as string;
  const investmentStrategy = formData.get("investment_strategy") as string;

  const { data, error } = await supabase
    .from("properties")
    .update({
      name: newName,
      address: address || null,
      city: city || null,
      state: state || null,
      units: units ? parseInt(units) : null,
      investment_strategy: investmentStrategy || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/properties");
  return data;
}

export async function deleteProperty(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // ── Fraud Prevention: Prevent deletion of properties with reports ──
  const { count: reportCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("property_id", id)
    .eq("user_id", userId);

  if (reportCount && reportCount > 0) {
    throw new Error(
      "Cannot delete a property that has reports. This prevents users from cycling properties to avoid subscription limits."
    );
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath("/dashboard/properties");
}
