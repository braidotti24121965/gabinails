"use server";

import { createAdminClient } from "@/lib/supabase/server";

const GABI_ORG_ID = process.env.NEXT_PUBLIC_GABI_ORG_ID || "11111111-1111-4111-8111-111111111111";

export async function getPublicBookingData() {
  const supabase = await createAdminClient();
  
  if (!supabase) {
    console.error("[PublicBooking] Supabase admin client not configured.");
    return { success: false, services: [], professionals: [] };
  }

  try {
    const { data: profData, error: profError } = await supabase
      .from("professionals")
      .select("id, name, specialties")
      .eq("organization_id", GABI_ORG_ID)
      .eq("active", true)
      .order("name");

    if (profError) {
      console.error("[PublicBooking] Error fetching professionals:", profError);
      return { success: false, services: [], professionals: [] };
    }

    const { data: srvData, error: srvError } = await supabase
      .from("services")
      .select("id, name, category, duration_minutes, price")
      .eq("organization_id", GABI_ORG_ID)
      .eq("active", true)
      .order("name");

    if (srvError) {
      console.error("[PublicBooking] Error fetching services:", srvError);
      return { success: false, services: [], professionals: [] };
    }

    return {
      success: true,
      professionals: profData.map((p: any) => ({
        id: p.id,
        name: p.name,
        initials: p.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
        specialty: p.specialties && p.specialties.length > 0 ? p.specialties.join(", ") : "Geral"
      })),
      services: srvData.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        duration: s.duration_minutes,
        price: s.price
      }))
    };
  } catch (error) {
    console.error("[PublicBooking] Internal error:", error);
    return { success: false, services: [], professionals: [] };
  }
}
