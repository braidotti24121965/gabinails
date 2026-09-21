export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { calculateAvailability } from "@/lib/availability-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const serviceDuration = parseInt(searchParams.get("duration") || "60", 10);
    const professionalId = searchParams.get("professionalId");
    const serviceId = searchParams.get("serviceId");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        date,
        availableSlots: ["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"],
        mode: "simulation",
      });
    }

    const result = await calculateAvailability({
      date,
      serviceDuration,
      professionalId,
      serviceId: serviceId || undefined
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
