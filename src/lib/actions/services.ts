"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
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
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("services")
    .select("*")
    // removed category order
    .order("name", { ascending: true });

  const { data: consumables } = await supabase.from("service_consumables").select("*");

  if (error || !data || data.length === 0) {
    return [];
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
  revalidatePath("/agendar");
  return { success: true, data };
}

export async function updateServiceConsumables(serviceId: string, consumables: { product_id: string; quantity: number }[]) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Sem conexão com o banco de dados." };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada." };

  const normalized = consumables.map(item => ({
    product_id: item.product_id,
    quantity: Number(item.quantity)
  }));
  const hasInvalidItem = normalized.some(item => !item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0);
  const hasDuplicateProduct = new Set(normalized.map(item => item.product_id)).size !== normalized.length;
  if (!serviceId || hasInvalidItem || hasDuplicateProduct) {
    return { success: false, error: "Configuração de consumo inválida." };
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (serviceError || !service) return { success: false, error: "Serviço não encontrado." };

  if (normalized.length > 0) {
    const productIds = normalized.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .in("id", productIds);
    if (productsError || products?.length !== productIds.length) {
      return { success: false, error: "Um ou mais produtos não pertencem a este estoque." };
    }

    const { error: upsertError } = await supabase.from("service_consumables").upsert(
      normalized.map(item => ({
        organization_id: profile.organization_id,
        service_id: serviceId,
        product_id: item.product_id,
        estimated_quantity: item.quantity
      })),
      { onConflict: "service_id,product_id" }
    );
    if (upsertError) return { success: false, error: upsertError.message };
  }

  let deleteQuery = supabase
    .from("service_consumables")
    .delete()
    .eq("service_id", serviceId)
    .eq("organization_id", profile.organization_id);
  if (normalized.length > 0) deleteQuery = deleteQuery.not("product_id", "in", `(${normalized.map(item => item.product_id).join(",")})`);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath("/");
  revalidatePath("/agendar");
  return { success: true };
}

export async function archiveServiceRecord(serviceId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('services').update({ active: false }).eq('id', serviceId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/agendar");
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
  revalidatePath("/agendar");
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
  revalidatePath("/agendar");
  return { success: true };
}
