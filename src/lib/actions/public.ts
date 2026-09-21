import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { fetchPublicBookingData } from "@/lib/services/public-booking.service";

// Using GABI_ORG_ID as requested without fallback UUID
const ORG_ID = process.env.GABI_ORG_ID;

export async function getPublicBookingData() {
  const supabase = await createAdminClient();

  if (!supabase) {
    console.error("[PublicBooking] Supabase admin client not configured.");
    return { success: false, services: [], professionals: [] };
  }

  const result = await fetchPublicBookingData(supabase, ORG_ID);
  if (!result.success) {
    console.error("[PublicBooking] Error:", result.error);
  }

  return {
    success: result.success,
    professionals: result.professionals,
    services: result.services
  };
}
