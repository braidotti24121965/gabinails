"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { services as demoServices } from "@/lib/demo-data";

export interface ServiceItem {
  id?: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  maintenance: number;
  active: boolean;
  depositRequired?: boolean;
  depositValue?: number;
}

export async function getServices(): Promise<ServiceItem[]> {
  if (!isSupabaseConfigured()) {
    return demoServices;
  }

  const supabase = await createClient();
  if (!supabase) return demoServices;

  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, duration_minutes, price, maintenance_days, active, deposit_required, deposit_value")
    .order("name", { ascending: true });

  if (error || !data || data.length === 0) {
    return demoServices;
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    duration: item.duration_minutes,
    price: Number(item.price),
    maintenance: item.maintenance_days || 0,
    active: item.active,
    depositRequired: item.deposit_required,
    depositValue: item.deposit_value ? Number(item.deposit_value) : undefined,
  }));
}

export async function createService(service: Omit<ServiceItem, "id">) {
  if (!isSupabaseConfigured()) {
    return { success: true, mode: "demo", data: service };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Cliente Supabase indisponível" };
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      name: service.name,
      category: service.category,
      duration_minutes: service.duration,
      price: service.price,
      maintenance_days: service.maintenance || null,
      active: service.active,
      deposit_required: service.depositRequired ?? true,
      deposit_value: service.depositValue ?? null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, mode: "supabase", data };
}
