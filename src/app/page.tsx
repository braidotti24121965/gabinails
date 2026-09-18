import { NailStudioApp } from "@/components/nail-studio-app";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClients } from "@/lib/actions/clients";
import { getProfessionals } from "@/lib/actions/professionals";
import { getSpecialties } from "@/lib/actions/specialties";
import { getAppointments } from "@/lib/actions/appointments";
import { getServices } from "@/lib/actions/services";
import { getFinance } from "@/lib/actions/finance";
import { getInventory } from "@/lib/actions/inventory";

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
  const appointments = await getAppointments();
  const services = await getServices();
  const financialData = await getFinance();
  const inventory = await getInventory();

  return <NailStudioApp 
    initialClients={clients} 
    initialProfessionals={professionals} 
    initialSpecialties={specialties}
    initialAppointments={appointments}
    initialServices={services}
    initialFinancials={financialData.data}
    initialStats={financialData.stats}
    initialInventory={inventory}
  />;
}
