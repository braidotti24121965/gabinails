import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const serviceDuration = parseInt(searchParams.get("duration") || "60", 10);
  const professionalId = searchParams.get("professionalId");

  // Se o Supabase não estiver configurado, retorna slots simulados realistas
  if (!isSupabaseConfigured()) {
    const defaultSlots = ["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"];
    return NextResponse.json({
      date,
      availableSlots: defaultSlots,
      mode: "simulation",
      intervalMinutes: 15,
      durationMinutes: serviceDuration,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Erro ao inicializar cliente de banco" }, { status: 500 });
  }

  // 1. Busca agendamentos do dia especificado
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  let query = supabase
    .from("appointments")
    .select("id, professional_id, starts_at, ends_at, status")
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .in("status", ["pending", "awaiting_deposit", "scheduled", "confirmed", "arrived", "in_progress"]);

  if (professionalId) {
    query = query.eq("professional_id", professionalId);
  }

  const { data: bookedAppointments, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Calcula slots do expediente (08:00 às 19:00) em intervalos de 15 minutos
  const openingHour = 8;
  const closingHour = 19;
  const availableSlots: string[] = [];

  for (let hour = openingHour; hour < closingHour; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const slotStartMinutes = hour * 60 + min;
      const slotEndMinutes = slotStartMinutes + serviceDuration;

      // Não excede o horário de fechamento
      if (slotEndMinutes > closingHour * 60) continue;

      const timeString = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotStartIso = new Date(`${date}T${timeString}:00`).getTime();
      const slotEndIso = slotStartIso + serviceDuration * 60 * 1000;

      // Verifica se há conflito com qualquer agendamento ativo
      const hasConflict = bookedAppointments?.some((app) => {
        const appStart = new Date(app.starts_at).getTime();
        const appEnd = new Date(app.ends_at).getTime();
        // Conflito de intervalo: max(start1, start2) < min(end1, end2)
        return Math.max(slotStartIso, appStart) < Math.min(slotEndIso, appEnd);
      });

      if (!hasConflict) {
        availableSlots.push(timeString);
      }
    }
  }

  return NextResponse.json({
    date,
    availableSlots,
    totalAvailable: availableSlots.length,
    mode: "supabase",
    intervalMinutes: 15,
  });
}
