"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getSpecialties() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("specialties")
    .select("id, name, active")
    .order("name");

  if (error) {
    console.error("Error fetching specialties:", error);
    return [];
  }

  return data;
}

export async function createSpecialtyRecord(name: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const { data, error } = await supabase
    .from("specialties")
    .insert([{ organization_id: profile.organization_id, name }])
    .select()
    .single();

  if (error) {
    console.error("Error creating specialty:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, data };
}
