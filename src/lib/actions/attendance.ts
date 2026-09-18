"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function finishAppointment(data: {
  appointmentId: string;
  amount: number; // raw value to pay
  paymentMethod: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

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
    .single();

  if (getErr || !appointment) return { success: false, error: "Agendamento não encontrado" };

  // 2. Mark as completed
  await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', data.appointmentId);

  // 3. Create Payment
  const { error: payErr } = await supabase
    .from('payments')
    .insert([{
      organization_id: profile.organization_id,
      appointment_id: data.appointmentId,
      client_id: appointment.client_id,
      kind: 'payment',
      method: data.paymentMethod === 'PIX' ? 'pix' : 
              data.paymentMethod === 'Dinheiro' ? 'cash' : 
              data.paymentMethod === 'Débito' ? 'debit' : 
              data.paymentMethod === 'Crédito' ? 'credit' : 'other',
      amount: data.amount,
      status: 'paid',
      paid_at: new Date().toISOString()
    }]);

  if (payErr) console.error("Error creating payment:", payErr);

  // 4. Create Commissions (Sum from items or default calculation)
  // MVP: just calculate 30% of total if not specified, to show in the UI.
  let commissionValue = appointment.items?.reduce((acc: number, it: any) => acc + Number(it.commission_value || 0), 0) || 0;
  if (commissionValue === 0) commissionValue = data.amount * 0.3; // Fallback to 30%

  await supabase
    .from('commissions')
    .insert([{
      organization_id: profile.organization_id,
      appointment_id: data.appointmentId,
      professional_id: appointment.professional_id,
      amount: commissionValue,
      status: 'pending'
    }]);

  
  // 5. Deduct Inventory (from service_consumables)
  if (appointment.items && appointment.items.length > 0) {
    const serviceIds = appointment.items.map((i: any) => i.service_id).filter(Boolean);
    if (serviceIds.length > 0) {
      // Find all consumables for these services
      const { data: consumables } = await supabase
        .from('service_consumables')
        .select('product_id, estimated_quantity, service_id')
        .in('service_id', serviceIds);

      if (consumables && consumables.length > 0) {
        const movementsToInsert: any[] = [];
        
        // We iterate over the items actually performed in this appointment
        for (const item of appointment.items) {
          if (!item.service_id) continue;
          
          // Get consumables for this specific service
          const serviceConsumables = consumables.filter(c => c.service_id === item.service_id);
          
          for (const cons of serviceConsumables) {
            movementsToInsert.push({
              organization_id: profile.organization_id,
              product_id: cons.product_id,
              movement_type: 'consumption',
              quantity: cons.estimated_quantity,
              appointment_item_id: item.id,
              source: 'appointment_conclusion'
            });
          }
        }

        if (movementsToInsert.length > 0) {
          const { error: invErr } = await supabase.from('stock_movements').insert(movementsToInsert);
          if (invErr) console.error("Error deducting inventory:", invErr);
        }
      }
    }
  }

  revalidatePath("/");

  return { success: true };
}
