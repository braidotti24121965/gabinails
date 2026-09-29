import { createAdminClient } from "@/lib/supabase/server";

interface AvailabilityParams {
  orgId: string;
  date: string; // YYYY-MM-DD
  serviceDuration: number; // minutes
  serviceId?: string;
  professionalId?: string | null;
}

export async function calculateAvailability({
  orgId,
  date,
  serviceDuration,
  serviceId,
  professionalId
}: AvailabilityParams) {
  const supabase = await createAdminClient();
  if (!supabase) throw new Error("Erro ao inicializar banco");
  if (!orgId) throw new Error("Organização não informada");

  // 1. Encontrar profissionais elegíveis da organização
  let profQuery = supabase
    .from("professionals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("active", true);

  if (professionalId && professionalId !== "any") {
    profQuery = profQuery.eq("id", professionalId);
  }
  
  const { data: profs, error: profErr } = await profQuery;
  if (profErr) throw new Error("Erro ao buscar profissionais");
  
  let eligibleProfIds = profs?.map(p => p.id) || [];
  
  if (eligibleProfIds.length === 0) {
    return { availableSlots: [], debug: { reason: "Nenhum profissional encontrado" } };
  }

  // 2. Fuso Horário Estrito de SP
  const spTimeZone = "America/Sao_Paulo";
  const startOfDaySP = `${date}T00:00:00-03:00`;
  const endOfDaySP = `${date}T23:59:59-03:00`;

  // Expira holds primeiro para a organização
  await supabase.from("appointments")
    .update({ status: 'cancelled', notes: 'Expirado automaticamente pelo motor.' })
    .eq("organization_id", orgId)
    .eq("status", "awaiting_deposit")
    .lt("hold_expires_at", new Date().toISOString());

  // Buscar todos os agendamentos do dia para os profissionais elegíveis da organização
  const { data: appointments, error: appErr } = await supabase
    .from("appointments")
    .select("professional_id, starts_at, ends_at")
    .eq("organization_id", orgId)
    .in("professional_id", eligibleProfIds)
    .gte("starts_at", new Date(startOfDaySP).toISOString())
    .lte("starts_at", new Date(endOfDaySP).toISOString())
    .in("status", ["pending", "scheduled", "confirmed", "awaiting_deposit"]);

  if (appErr) throw new Error(appErr.message);

  const availableSlots: string[] = [];
  const now = new Date();
  
  const nowSPStr = new Intl.DateTimeFormat('en-US', {
    timeZone: spTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(now);
  
  const [mm, dd, yyyy] = nowSPStr.split(", ")[0].split("/");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const isToday = date === todayStr;
  
  const currentSPHour = parseInt(nowSPStr.split(", ")[1].split(":")[0]);
  const currentSPMinute = parseInt(nowSPStr.split(", ")[1].split(":")[1]);
  const currentTotalMinutes = currentSPHour * 60 + currentSPMinute;

  const dayStartMinutes = 8 * 60;
  const dayEndMinutes = 19 * 60;

  for (let minOffset = dayStartMinutes; minOffset + serviceDuration <= dayEndMinutes; minOffset += 15) {
    if (isToday && minOffset <= currentTotalMinutes + 15) continue;

    const hour = Math.floor(minOffset / 60);
    const min = minOffset % 60;
    const timeString = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    
    const slotStartIso = new Date(`${date}T${timeString}:00-03:00`).getTime();
    const slotEndIso = slotStartIso + serviceDuration * 60 * 1000;

    let slotAvailable = false;

    for (const pId of eligibleProfIds) {
      const profAppointments = appointments?.filter(a => a.professional_id === pId) || [];
      
      const hasConflict = profAppointments.some(app => {
        const appStart = new Date(app.starts_at).getTime();
        const appEnd = new Date(app.ends_at).getTime();
        return Math.max(slotStartIso, appStart) < Math.min(slotEndIso, appEnd);
      });

      if (!hasConflict) {
        slotAvailable = true;
        break;
      }
    }

    if (slotAvailable) {
      availableSlots.push(timeString);
    }
  }

  return { availableSlots, debug: { eligibleProfCount: eligibleProfIds.length, appointmentsCount: appointments?.length } };
}

export async function findAvailableProfessionalForSlot({
  orgId,
  date,
  time,
  serviceDuration,
  serviceId,
  preferredProfessionalId
}: { orgId: string, date: string, time: string, serviceDuration: number, serviceId?: string, preferredProfessionalId?: string | null }) {
  const supabase = await createAdminClient();
  if (!supabase) throw new Error("Erro ao inicializar banco");
  if (!orgId) throw new Error("Organização não informada");

  let profQuery = supabase.from("professionals").select("id").eq("organization_id", orgId).eq("active", true);
  const { data: profs } = await profQuery;
  let eligibleProfIds = profs?.map(p => p.id) || [];
  
  if (eligibleProfIds.length === 0) return null;
  
  if (preferredProfessionalId && eligibleProfIds.includes(preferredProfessionalId)) {
    eligibleProfIds = [
      preferredProfessionalId,
      ...eligibleProfIds.filter(id => id !== preferredProfessionalId)
    ];
  }

  const startOfDaySP = `${date}T00:00:00-03:00`;
  const endOfDaySP = `${date}T23:59:59-03:00`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("professional_id, starts_at, ends_at")
    .eq("organization_id", orgId)
    .in("professional_id", eligibleProfIds)
    .gte("starts_at", new Date(startOfDaySP).toISOString())
    .lte("starts_at", new Date(endOfDaySP).toISOString())
    .in("status", ["pending", "scheduled", "confirmed", "awaiting_deposit"]);

  const slotStartIso = new Date(`${date}T${time}:00-03:00`).getTime();
  const slotEndIso = slotStartIso + serviceDuration * 60 * 1000;

  for (const pId of eligibleProfIds) {
    const profAppointments = appointments?.filter(a => a.professional_id === pId) || [];
    
    const hasConflict = profAppointments.some(app => {
      const appStart = new Date(app.starts_at).getTime();
      const appEnd = new Date(app.ends_at).getTime();
      return Math.max(slotStartIso, appStart) < Math.min(slotEndIso, appEnd);
    });

    if (!hasConflict) return pId;
  }

  return null;
}
