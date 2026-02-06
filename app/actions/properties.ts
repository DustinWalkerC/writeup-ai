"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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

