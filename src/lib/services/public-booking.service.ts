import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPublicBookingData(supabase: SupabaseClient, orgId?: string | null) {
  if (!orgId) {
    return { success: false, services: [], professionals: [], error: "Missing configuration" };
  }
  
  if (!supabase) {
    return { success: false, services: [], professionals: [], error: "Missing client" };
  }

  try {
    const { data: profData, error: profError } = await supabase
      .from("professionals")
      .select("id, name, specialties")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name");

    if (profError) {
      return { success: false, services: [], professionals: [], error: "Database error" };
    }

    const { data: srvData, error: srvError } = await supabase
      .from("services")
      .select("id, name, category, duration_minutes, price")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name");

    if (srvError) {
      return { success: false, services: [], professionals: [], error: "Database error" };
    }

    return {
      success: true,
      professionals: profData.map((p) => ({
        id: p.id,
        name: p.name,
        initials: p.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
        specialty: p.specialties && p.specialties.length > 0 ? p.specialties.join(", ") : "Geral"
      })),
      services: srvData.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        duration: s.duration_minutes,
        price: s.price
      }))
    };
  } catch (error) {
    return { success: false, services: [], professionals: [], error: "Internal error" };
  }
}
