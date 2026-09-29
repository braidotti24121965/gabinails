export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { calculateAvailability } from "@/lib/availability-engine";
import { getOrgBySlug } from "@/lib/services/public-booking.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "gabi-ludwig";
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

    const supabase = await createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Erro ao conectar com banco" }, { status: 500 });
    }

    const org = await getOrgBySlug(supabase, slug);
    if (!org) {
      return NextResponse.json({ error: "Salão não encontrado ou inativo" }, { status: 404 });
    }

    const result = await calculateAvailability({
      orgId: org.id,
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
