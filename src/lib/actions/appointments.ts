"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Appointment, AppointmentStatus } from "@/lib/demo-data"; // We will map DB to this for now to not break the UI

export async function getAppointments(): Promise<Appointment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      source,
      client:clients(name, phone),
      professional:professionals(name),
      items:appointment_items(
        id,
        service:services(name),
        unit_price
      ),
      payments(amount)
    `)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }

  // Map DB structure to the UI structure (Appointment interface)
  return data.map((row: any) => {
    // Format times
    const dStart = new Date(row.starts_at);
    const dEnd = new Date(row.ends_at);
    const time = dStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const end = dEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Sum prices
    const price = row.items?.reduce((acc: number, item: any) => acc + Number(item.unit_price || 0), 0) || 0;
    const paid = row.payments?.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) || 0;
    
    // Service name (first service or generic)
    const serviceName = row.items?.map((i: any) => i.service?.name).filter(Boolean).join(" + ") || "Serviço";

    // Map status from db to UI readable
    const statusMap: Record<string, string> = {
      pending: "Pendente",
      awaiting_deposit: "Aguardando sinal",
      scheduled: "Agendado",
      confirmed: "Confirmado",
      arrived: "Cliente chegou",
      in_progress: "Em atendimento",
      completed: "Concluído",
      cancelled: "Cancelado",
      no_show: "Não compareceu"
    };

    return {
      id: row.id,
      time,
      end,
      client: row.client?.name || "Desconhecida",
      phone: row.client?.phone || "",
      professional: row.professional?.name || "Desconhecida",
      service: serviceName,
      status: (statusMap[row.status] || "Pendente") as AppointmentStatus,
      price,
      paid,
      source: row.source === "online" ? "Online" : "Interno",
      items: row.items?.map((i: any) => ({ id: i.id, name: i.service?.name || "Serviço", price: Number(i.unit_price) })) || []
    };
  });
}

export async function createAppointmentRecord(data: {
  clientId: string;
  professionalId: string;
  services: { id: string; price: number; durationMinutes: number }[];
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  durationMinutes: number;
  price: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  // Calculate timestamps
  const startsAt = new Date(`${data.dateStr}T${data.timeStr}:00`).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + data.durationMinutes * 60000).toISOString();

  // Insert appointment
  const { data: appointment, error: appError } = await supabase
    .from("appointments")
    .insert([{
      organization_id: profile.organization_id,
      client_id: data.clientId,
      professional_id: data.professionalId,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "awaiting_deposit",
      source: "internal"
    }])
    .select()
    .single();

  if (appError || !appointment) {
    console.error("Error creating appointment:", appError);
    if (appError?.message?.includes("appointments_no_overlap")) {
      return { success: false, error: "Este horário já está ocupado para esta profissional. Por favor, escolha outro horário." };
    }
    return { success: false, error: appError?.message || "Failed to create appointment" };
  }

  // Insert appointment item (service)
  const itemsToInsert = data.services.map((s: any) => ({
      organization_id: profile.organization_id!,
      appointment_id: appointment.id,
      service_id: s.id,
      professional_id: data.professionalId,
      description: "Agendamento",
      duration_minutes: s.durationMinutes,
      unit_price: s.price,
      commission_type: "percentage",
      commission_value: 0
    }));

    const { error: itemError } = await supabase
      .from("appointment_items")
      .insert(itemsToInsert);

  if (itemError) {
    console.error("Error creating appointment item:", itemError);
    return { success: false, error: "Falha ao registrar os serviços do agendamento: " + itemError.message };
  }

  revalidatePath("/");
  return { success: true, data: appointment };
}

export async function cancelAppointmentRecord(id: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
  revalidatePath("/");
  return { success: true };
}

export async function updateAppointmentRecord(appointmentId: string, data: {
  clientId: string;
  professionalId: string;
  services: { id: string; price: number; durationMinutes: number }[];
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
  price: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };
  
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const startsAt = new Date(`${data.dateStr}T${data.timeStr}:00`).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + data.durationMinutes * 60000).toISOString();

  // Update appointment
  const { error: appError } = await supabase
    .from("appointments")
    .update({
      client_id: data.clientId,
      professional_id: data.professionalId,
      starts_at: startsAt,
      ends_at: endsAt
    })
    .eq("id", appointmentId);

  if (appError) {
    if (appError.message?.includes("appointments_no_overlap")) {
      return { success: false, error: "Este horário já está ocupado para esta profissional." };
    }
    return { success: false, error: appError.message };
  }

  // Replace items
  await supabase.from("appointment_items").delete().eq("appointment_id", appointmentId);
  
  const itemsToInsert = data.services.map(s => ({
    organization_id: profile.organization_id!,
    appointment_id: appointmentId,
    service_id: s.id,
    professional_id: data.professionalId,
    description: "Agendamento (Editado)",
    duration_minutes: s.durationMinutes,
    unit_price: s.price,
    commission_type: "percentage",
    commission_value: 0
  }));

  await supabase.from("appointment_items").insert(itemsToInsert);

  revalidatePath("/");
  return { success: true };
}

export async function addServiceToAppointment(appointmentId: string, professionalId: string, serviceId: string, price: number, durationMinutes: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };
  
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const { data, error } = await supabase.from("appointment_items").insert([{
    organization_id: profile.organization_id,
    appointment_id: appointmentId,
    service_id: serviceId,
    professional_id: professionalId,
    description: "Adicional",
    duration_minutes: durationMinutes,
    unit_price: price,
    commission_type: "percentage",
    commission_value: 0
  }]).select("id").single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true, id: data?.id };
}

export async function removeServiceFromAppointment(itemId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  await supabase.from("appointment_items").delete().eq("id", itemId);
  revalidatePath("/");
  return { success: true };
}
