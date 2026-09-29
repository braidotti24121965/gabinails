"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sellPackage(clientId: string, name: string, totalSessions: number, price: number, method: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No DB" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  
  const { data, error } = await supabase.rpc('sell_package', {
    p_organization_id: profile?.organization_id,
    p_client_id: clientId,
    p_name: name,
    p_total_sessions: totalSessions,
    p_price: price,
    p_payment_method: method,
    p_payment_status: 'paid',
    p_expires_at: null
  });

  if (error) {
    console.error("sellPackage error", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, packageId: data };
}

export async function deductPackage(clientId: string, packageId: string, appointmentId?: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No DB" };

  const { error } = await supabase.rpc('use_package_session', {
    p_package_id: packageId,
    p_appointment_id: appointmentId || null
  });

  if (error) {
    console.error("deductPackage error", error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
