"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { appointments as demoAppointments, type Appointment, type AppointmentStatus } from "@/lib/demo-data";

export async function getAppointments(): Promise<Appointment[]> {
  if (!isSupabaseConfigured()) {
    return demoAppointments;
  }

  const supabase = await createClient();
  if (!supabase) return demoAppointments;

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      source,
      clients (name, phone),
      professionals (name),
      appointment_items (description, unit_price, quantity)
    `)
    .order("starts_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return demoAppointments;
  }

  const statusMap: Record<string, AppointmentStatus> = {
    pending: "Pendente",
    awaiting_deposit: "Aguardando sinal",
    scheduled: "Agendado",
    confirmed: "Confirmado",
    arrived: "Cliente chegou",
    in_progress: "Em atendimento",
    completed: "Concluído",
    rescheduled: "Reagendado",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };

  return data.map((item) => {
    const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;
    const professional = Array.isArray(item.professionals) ? item.professionals[0] : item.professionals;
    const items = Array.isArray(item.appointment_items) ? item.appointment_items : [];

    const startTime = new Date(item.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const endTime = new Date(item.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const totalCalculated = items.reduce(
      (sum: number, it: { unit_price: number | string; quantity: number | string }) =>
        sum + Number(it.unit_price) * Number(it.quantity),
      0
    );

    return {
      id: item.id,
      time: startTime,
      end: endTime,
      client: client?.name || "Cliente",
      phone: client?.phone || "",
      service: items[0]?.description || "Serviço",
      professional: professional?.name || "Profissional",
      status: statusMap[item.status] || "Confirmado",
      price: totalCalculated || 130,
      paid: item.status === "completed" ? totalCalculated : undefined,
      source: item.source === "online" ? "Online" : "Interno",
    };
  });
}

export async function createAppointment(data: {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  serviceId?: string;
  serviceName: string;
  professionalId?: string;
  professionalName: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  requiresDeposit: boolean;
}) {
  if (!isSupabaseConfigured()) {
    const startParts = data.time.split(":");
    const startHour = parseInt(startParts[0], 10);
    const startMin = parseInt(startParts[1], 10);
    const endMinutesTotal = startHour * 60 + startMin + data.durationMinutes;
    const endHour = Math.floor(endMinutesTotal / 60) % 24;
    const endMin = endMinutesTotal % 60;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    const newAppointment: Appointment = {
      id: `a${Date.now()}`,
      time: data.time,
      end: endTime,
      client: data.clientName,
      phone: data.clientPhone,
      service: data.serviceName,
      professional: data.professionalName,
      status: data.requiresDeposit ? "Aguardando sinal" : "Confirmado",
      price: data.price,
      source: "Interno",
    };

    return { success: true, mode: "demo", appointment: newAppointment };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase indisponível" };

  const startsAt = new Date(`${data.date}T${data.time}:00`);
  const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60 * 1000);

  const status = data.requiresDeposit ? "awaiting_deposit" : "confirmed";

  // Se não temos IDs reais do banco, operamos com fallback
  if (!data.clientId || !data.professionalId) {
    return {
      success: true,
      mode: "demo",
      message: "Agendamento registrado em modo compatibilidade.",
    };
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      client_id: data.clientId,
      professional_id: data.professionalId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status,
      source: "internal",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, mode: "supabase", appointment };
}

export async function finishAppointmentRecord(params: {
  appointmentId: string;
  totalAmount: number;
  depositAmount: number;
  paymentMethod: string;
}) {
  if (!isSupabaseConfigured()) {
    return { success: true, mode: "demo" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  // 1. Atualiza status do agendamento para completed
  const { error: appError } = await supabase
    .from("appointments")
    .update({
      status: "completed",
      actual_end_at: new Date().toISOString(),
    })
    .eq("id", params.appointmentId);

  if (appError) {
    return { success: false, error: appError.message };
  }

  // 2. Registra o pagamento complementar recebido
  const balanceToReceive = params.totalAmount - params.depositAmount;
  if (balanceToReceive > 0) {
    const methodMap: Record<string, string> = {
      PIX: "pix",
      Dinheiro: "cash",
      Débito: "debit",
      Crédito: "credit",
    };

    await supabase.from("payments").insert({
      appointment_id: params.appointmentId,
      kind: "payment",
      method: methodMap[params.paymentMethod] || "pix",
      amount: balanceToReceive,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
  }

  return { success: true, mode: "supabase" };
}
