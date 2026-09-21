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
  consumables?: { product_id: string; estimated_quantity: number }[];
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

  const { data: consumables } = await supabase.from("service_consumables").select("*");

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
    active: item.active,
    consumables: consumables?.filter(c => c.service_id === item.id).map(c => ({ product_id: c.product_id, estimated_quantity: c.estimated_quantity })) || []
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

export async function updateServiceConsumables(serviceId: string, consumables: { product_id: string; quantity: number }[]) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  // First delete existing consumables for this service
  await supabase.from("service_consumables").delete().eq("service_id", serviceId);

  // Then insert the new ones
  if (consumables.length > 0) {
    const toInsert = consumables.map(c => ({
      organization_id: profile.organization_id,
      service_id: serviceId,
      product_id: c.product_id,
      estimated_quantity: c.quantity
    }));
    await supabase.from("service_consumables").insert(toInsert);
  }

  revalidatePath("/");
  return { success: true };
}

export async function archiveServiceRecord(serviceId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('services').update({ active: false }).eq('id', serviceId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function deleteServiceRecord(serviceId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) {
    // se falhar por FK, faz archive fallback
    await supabase.from('services').update({ active: false }).eq('id', serviceId);
  }
  revalidatePath("/");
  return { success: true };
}

export async function updateServiceRecord(serviceId: string, service: Omit<ServiceItem, 'id' | 'active'>) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('services').update({
    name: service.name,
    category: service.category,
    duration_minutes: service.duration,
    price: service.price,
    maintenance_days: service.maintenance
  }).eq('id', serviceId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}
