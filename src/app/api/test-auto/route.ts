import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no db" });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, starts_at, status")
    .order("starts_at", { ascending: false });

  return NextResponse.json({ tomorrowStr, allAppts: appts });
}
