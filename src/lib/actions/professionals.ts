"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { professionals as demoProfessionals } from "@/lib/demo-data";

export interface ProfessionalItem {
  id?: string;
  name: string;
  initials: string;
  specialty: string;
  today: number;
  production: number;
  occupation: number;
  commission: number;
  
  // Real DB fields
  email?: string;
  phone?: string;
  default_commission?: number;
  notes?: string;
}

export async function getProfessionals(): Promise<ProfessionalItem[]> {
  if (!isSupabaseConfigured()) {
    return demoProfessionals;
  }

  const supabase = await createClient();
  if (!supabase) return demoProfessionals;

  const { data, error } = await supabase
    .from("professionals")
    .select(`
      id,
      name,
      email,
      phone,
      specialties,
      default_commission,
      notes,
      active
    `)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    return demoProfessionals;
  }

  return data.map((item) => {
    return {
      id: item.id,
      name: item.name,
      initials: item.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
      specialty: item.specialties && item.specialties.length > 0 ? item.specialties.join(", ") : "Geral",
      email: item.email,
      phone: item.phone,
      default_commission: item.default_commission,
      notes: item.notes,
      
      // Indicators (mocked for now until we have real financial queries)
      today: 0,
      production: 0,
      occupation: 0,
      commission: 0,
    };
  });
}

export async function createProfessionalRecord(data: { name: string; email?: string; phone?: string; specialties: string[]; default_commission: number; notes?: string }) {
  if (!isSupabaseConfigured()) {
    return { success: true, mode: "demo", data: { id: "demo-" + Date.now() } };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const { data: newProf, error } = await supabase
    .from("professionals")
    .insert({
      organization_id: profile.organization_id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      specialties: data.specialties,
      default_commission: data.default_commission,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, mode: "supabase", data: newProf };
}

export async function updateProfessionalRecord(id: string, data: { name: string; email?: string; phone?: string; specialties: string[]; default_commission: number; notes?: string }) {
  if (!isSupabaseConfigured() || id.startsWith("demo-")) return { success: true };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  const { error } = await supabase
    .from("professionals")
    .update({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      specialties: data.specialties,
      default_commission: data.default_commission,
      notes: data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function archiveProfessionalRecord(id: string) {
  if (!isSupabaseConfigured() || id.startsWith("demo-")) return { success: true };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  const { error } = await supabase
    .from("professionals")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
