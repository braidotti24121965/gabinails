"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { services as demoServices } from "@/lib/demo-data";
import { revalidatePath } from "next/cache";

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number;
  maintenance: number;
  active: boolean;
}

export async function getServices(): Promise<ServiceItem[]> {
  if (!isSupabaseConfigured()) {
    return demoServices.map((s, i) => ({ ...s, id: "demo-s-" + i }));
  }

  const supabase = await createClient();
  if (!supabase) return demoServices.map((s, i) => ({ ...s, id: "demo-s-" + i }));

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data || data.length === 0) {
    // Return demo if empty
    return demoServices.map((s, i) => ({ ...s, id: "demo-s-" + i }));
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    duration: item.duration_minutes,
    price: item.price,
    maintenance: item.maintenance_days || 0,
    active: item.active
  }));
}

export async function createServiceRecord(service: Omit<ServiceItem, 'id' | 'active'>) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const { data, error } = await supabase
    .from("services")
    .insert([{
      organization_id: profile.organization_id,
      name: service.name,
      category: service.category,
      duration_minutes: service.duration,
      price: service.price,
      maintenance_days: service.maintenance,
      active: true
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, data };
}
