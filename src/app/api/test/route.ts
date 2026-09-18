import { NextResponse } from "next/server";
import { getAppointments } from "@/lib/actions/appointments";

export async function GET() {
  const data = await getAppointments();
  return NextResponse.json(data);
}
