import { NailStudioApp } from "@/components/nail-studio-app";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClients } from "@/lib/actions/clients";
import { getProfessionals } from "@/lib/actions/professionals";
import { getSpecialties } from "@/lib/actions/specialties";

export default async function Page() {
  const supabase = await createClient();
  
  // Protect route
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
  }

  // Load real data
  const clients = await getClients();
  const professionals = await getProfessionals();
  const specialties = await getSpecialties();

  return <NailStudioApp initialClients={clients} initialProfessionals={professionals} initialSpecialties={specialties} />;
}
