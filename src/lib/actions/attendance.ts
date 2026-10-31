"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function finishAppointment(data: {
  appointmentId: string;
  amount: number; // raw value to pay
  paymentMethod: string;
  packageId?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    return { success: false, error: "Perfil ou organização não encontrado." };
  }

  // 1. Get Appointment and items
  const { data: appointment, error: getErr } = await supabase
    .from('appointments')
    .select(`
      id,
      client_id,
      professional_id,
      items:appointment_items(
        id,
        service_id,
        professional_id,
        unit_price,
        commission_value
      )
    `)
    .eq('id', data.appointmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (getErr || !appointment) return { success: false, error: "Agendamento não encontrado" };

    // 2. Prepare Commissions
  const commissions: any[] = [];
  if (appointment.items && appointment.items.length > 0) {
    appointment.items.forEach((item: any) => {
      let val = Number(item.commission_value || 0);
      if (val === 0 && item.unit_price) {
        val = Number(item.unit_price) * 0.3; // 30% default
      } else if (val === 0) {
        val = (data.amount / appointment.items.length) * 0.3;
      }
      commissions.push({
        appointment_item_id: item.id,
        professional_id: item.professional_id || appointment.professional_id,
        amount: val
      });
    });
  }

  // 3. Prepare Inventory Deductions
  const inventoryDeductions: any[] = [];
  if (appointment.items && appointment.items.length > 0) {
    const serviceIds = appointment.items.map((i: any) => i.service_id).filter(Boolean);
    if (serviceIds.length > 0) {
      const { data: consumables, error: consErr } = await supabase
        .from('service_consumables')
        .select('product_id, estimated_quantity, service_id')
        .in('service_id', serviceIds);

      if (consErr) return { success: false, error: "Erro ao buscar consumíveis." };

      if (consumables && consumables.length > 0) {
        for (const item of appointment.items) {
          if (!item.service_id) continue;
          const serviceConsumables = consumables.filter(c => c.service_id === item.service_id);
          for (const cons of serviceConsumables) {
            inventoryDeductions.push({
              product_id: cons.product_id,
              quantity: cons.estimated_quantity,
              appointment_item_id: item.id
            });
          }
        }
      }
    }
  }

  // 4. Handle Atomic Checkout via new RPC
  const { error: rpcErr } = await supabase.rpc('finish_appointment_checkout_full', {
    p_appointment_id: data.appointmentId,
    p_payment_amount: data.packageId ? 0 : data.amount,
    p_payment_method: data.packageId ? 'other' : data.paymentMethod,
    p_package_id: data.packageId || null,
    p_commissions: commissions,
    p_inventory_deductions: inventoryDeductions
  });

  if (rpcErr) {
    return { success: false, error: "Erro no checkout: " + rpcErr.message };
  }

  revalidatePath("/");

  return { success: true };
}

export async function getCheckoutCorrectionPackages(appointmentId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Sem conexão", packages: [] as { id: string; name: string; remaining_sessions: number; linked: boolean }[] };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sessão expirada", packages: [] as { id: string; name: string; remaining_sessions: number; linked: boolean }[] };
  const { data: profile } = await supabase.from("profiles").select("organization_id,role").eq("id",user.id).maybeSingle();
  if (!profile || !["admin","owner","manager"].includes(profile.role)) return { success: false, error: "Acesso administrativo necessário", packages: [] as { id: string; name: string; remaining_sessions: number; linked: boolean }[] };
  const { data: appointment } = await supabase.from("appointments").select("client_id,status").eq("id",appointmentId).eq("organization_id",profile.organization_id).maybeSingle();
  if (!appointment || appointment.status !== "completed") return { success: false, error: "Atendimento não concluído", packages: [] as { id: string; name: string; remaining_sessions: number; linked: boolean }[] };
  const { data: packages, error } = await supabase.from("packages").select("id,name,remaining_sessions").eq("organization_id",profile.organization_id).eq("client_id",appointment.client_id).order("created_at",{ascending:false});
  if (error) return { success:false,error:error.message,packages:[] as { id:string;name:string;remaining_sessions:number;linked:boolean }[] };
  const { data: sessions } = await supabase.from("package_sessions").select("package_id").eq("appointment_id",appointmentId).eq("organization_id",profile.organization_id).eq("status","used");
  return { success:true, packages:(packages || []).map(p=>({...p,linked:!!sessions?.some(s=>s.package_id===p.id)})) };
}

export async function correctCheckoutWithPackage(appointmentId:string,packageId:string,reason:string) {
  const supabase = await createClient();
  if (!supabase) return { success:false,error:"Sem conexão" };
  const { data, error } = await supabase.rpc("correct_package_checkout",{p_appointment_id:appointmentId,p_package_id:packageId,p_reason:reason});
  if (error) return { success:false,error:error.message };
  revalidatePath("/");
  return { success:true,alreadyLinked:data==="already_linked" };
}
