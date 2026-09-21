"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

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
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

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
    
  // Fetch pending commissions for each professional
  const { data: comms } = await supabase.from('commissions').select('professional_id, amount').eq('status', 'generated');

  if (error || !data) {
    return [];
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
      
      // Indicators
      today: 0, // Pending implement
      production: 0, // Pending implement
      occupation: 0, // Pending implement
      commission: comms ? comms.filter(c => c.professional_id === item.id).reduce((acc, c) => acc + Number(c.amount), 0) : 0,
    };
  });
}

export async function createProfessionalRecord(data: { name: string; email?: string; phone?: string; specialties: string[]; default_commission: number; notes?: string }) {
  if (!isSupabaseConfigured()) return { success: false, error: "No connection" };

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
  if (!isSupabaseConfigured()) return { success: true };

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
  if (!isSupabaseConfigured()) return { success: true };

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
