import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const serviceDuration = parseInt(searchParams.get("duration") || "60", 10);
    const professionalId = searchParams.get("professionalId");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        date,
        availableSlots: ["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"],
        mode: "simulation",
      });
    }

    const supabase = await createClient();
    if (!supabase) throw new Error("Erro ao inicializar cliente de banco");

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    let query = supabase.from("appointments").select("starts_at, ends_at").gte("starts_at", startOfDay).lte("starts_at", endOfDay).in("status", ["pending", "scheduled", "confirmed"]);
    if (professionalId) query = query.eq("professional_id", professionalId);

    const { data: bookedAppointments, error } = await query;
    if (error) throw new Error(error.message);

    const availableSlots: string[] = [];
    const now = new Date();
    // using UTC offset directly is safer across environments
    const utcOffset = -3;
    const spTime = new Date(now.getTime() + (utcOffset * 60 * 60 * 1000));
    const todayStr = spTime.toISOString().split("T")[0];
    const currentHour = spTime.getUTCHours();
    const currentMinute = spTime.getUTCMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const isToday = date === todayStr;

    for (let hour = 8; hour < 19; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const slotStartMinutes = hour * 60 + min;
        if (slotStartMinutes + serviceDuration > 19 * 60) continue;
        if (isToday && slotStartMinutes <= currentTotalMinutes + 15) continue;

        const timeString = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        const slotStartIso = new Date(`${date}T${timeString}:00`).getTime();
        const slotEndIso = slotStartIso + serviceDuration * 60 * 1000;

        const hasConflict = bookedAppointments?.some((app) => {
          const appStart = new Date(app.starts_at).getTime();
          const appEnd = new Date(app.ends_at).getTime();
          return Math.max(slotStartIso, appStart) < Math.min(slotEndIso, appEnd);
        });

        if (!hasConflict) availableSlots.push(timeString);
      }
    }

    return NextResponse.json({ availableSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
