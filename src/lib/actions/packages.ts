"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sellPackage(clientId: string, name: string, totalSessions: number, price: number, method: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Nome do pacote não pode ser vazio" };
  }
  if (!price || price <= 0) {
    return { success: false, error: "Preço deve ser maior que zero" };
  }
  if (!totalSessions || totalSessions <= 0) {
    return { success: false, error: "Total de sessões deve ser maior que zero" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No DB" };

  const { data, error } = await supabase.rpc('sell_package', {
    p_client_id: clientId,
    p_name: name.trim(),
    p_total_sessions: totalSessions,
    p_price: price,
    p_payment_method: method,
    p_expires_at: null
  });

  if (error) {
    console.error("sellPackage error", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, packageId: data };
}

export async function getActivePackages(clientId: string) {
  const supabase = await createClient();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .gt('remaining_sessions', 0);
    
  if (error) return [];
  return data;
}

export async function deductPackage(clientId: string, packageId: string, appointmentId?: string) {
  // Not used directly in new atomic flow, but keeping for standalone usage if needed
  // Note: we removed use_package_session from RPC to simplify and avoid bypasses. 
  // Actually wait, use_package_session is deleted! 
  // I will just return error or remove it.
  return { success: false, error: "Use finishAppointment for deduction" };
}

export async function deletePackage(packageId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('packages').update({ status: 'cancelled' }).eq('id', packageId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function updatePackage(packageId: string, name: string, total: number, remaining: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('packages').update({ name, total_sessions: total, remaining_sessions: remaining }).eq('id', packageId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}
