"use server";
import { createClient } from "@/lib/supabase/server";

export async function getRemindersForTomorrow(orgName: string = "Studio") {
  const supabase = await createClient();
  if (!supabase) return [];

  // Limit strictly to tomorrow (America/Sao_Paulo)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // simplistic

  const { data: appts } = await supabase
    .from("appointments")
    .select(`
      id,
      client_id,
      starts_at,
      status,
      client:clients(name, phone),
      professional:professionals(name),
      items:appointment_items(service:services(name))
    `)
    .eq("status", "scheduled")
    .gte("starts_at", `${tomorrowStr}T00:00:00-03:00`)
    .lt("starts_at", `${tomorrowStr}T23:59:59-03:00`)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (!appts) return [];

  return appts.map((a: any) => {
    const d = new Date(a.starts_at);
    // Convert to BR time for display
    const time = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: '2-digit', month: '2-digit' });
    const services = a.items?.map((i: any) => i.service?.name).join(" e ") || "seu procedimento";
    const firstName = a.client?.name?.split(" ")[0] || "Cliente";
    
    const message = `Oi ${firstName}, tudo bem? Aqui é do ${orgName}! Passando para lembrar do nosso horário agendado para o dia ${date} às ${time} para fazer ${services}. Por favor, confirme respondendo a esta mensagem. Te esperamos! 🥰`;
    
    return {
      id: a.id,
      clientId: a.client_id,
      clientName: a.client?.name || "Cliente",
      phone: a.client?.phone || "",
      time,
      services,
      message,
      sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "reminders")
    };
  });
}

export async function getOverdueMaintenances(orgName: string = "Studio") {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: pastAppts } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      client_id,
      client:clients(name, phone),
      items:appointment_items(service:services(name, maintenance_days)),
      message_jobs (id, status, payload)
    `)
    .eq("status", "completed")
    .order("starts_at", { ascending: false });

  if (!pastAppts) return [];

  // Active statuses: pending, awaiting_deposit, scheduled, confirmed, arrived, in_progress
  const activeStatuses = ['pending', 'awaiting_deposit', 'scheduled', 'confirmed', 'arrived', 'in_progress'];
  const { data: futureAppts } = await supabase
    .from("appointments")
    .select("client_id")
    .in("status", activeStatuses)
    .gte("starts_at", new Date().toISOString());

  const futureClientIds = new Set((futureAppts || []).map(a => a.client_id));

  const latestMaintenanceByClient = new Map();
  const keywords = ["alongamento", "manutenção", "fibra", "gel", "acrílico"];

  pastAppts.forEach(app => {
    if (!app.client_id) return;
    
    let hasMaintenance = false;
    let fallbackDays = 20;

    app.items?.forEach((i: any) => {
      const name = i.service?.name?.toLowerCase() || "";
      // Assume maintenance_days if available, else check keywords
      if (keywords.some(k => name.includes(k))) {
        hasMaintenance = true;
        // In this schema, maybe maintenance_days isn't loaded so use 20
        // We will default to 20 for this exercise unless it has `maintenance_days`
        if (i.service?.maintenance_days) {
            fallbackDays = i.service.maintenance_days;
        }
      }
    });

    if (hasMaintenance && !latestMaintenanceByClient.has(app.client_id)) {
      (app as any).maintenanceDays = fallbackDays;
      latestMaintenanceByClient.set(app.client_id, app);
    }
  });

  const now = new Date();
  const overdue: any[] = [];

  for (const [clientId, app] of Array.from(latestMaintenanceByClient.entries())) {
    if (futureClientIds.has(clientId)) continue; 

    const apptDate = new Date(app.starts_at);
    // Calc diff in São Paulo time
    const diffTime = now.getTime() - apptDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const thresholdDays = app.maintenanceDays || 20;

    if (diffDays > thresholdDays) {
      const firstName = app.client?.name?.split(" ")[0] || "Cliente";
      const services = app.items?.map((i: any) => i.service?.name).join(" e ") || "unhas";
      
      const message = `Oi ${firstName}, tudo bem? Aqui é do ${orgName}! Vi que já faz ${diffDays} dias desde a sua última vez aqui para fazer ${services}. Para garantir que suas unhas fiquem sempre lindas e intactas, que tal agendarmos a sua manutenção para essa semana? 🥰`;

      overdue.push({
        id: app.id,
        clientId,
        clientName: app.client?.name || "Cliente",
        phone: app.client?.phone || "",
        daysSince: diffDays,
        lastService: services,
        lastDate: apptDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        message,
        sent: Array.isArray(a.message_jobs) && a.message_jobs.some((job: any) => job.payload?.list === "overdue")
      });
    }
  }

  return overdue.sort((a, b) => b.daysSince - a.daysSince); 
}

export async function markMessageSent(clientId: string, type: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  const { error } = await supabase.from('message_jobs').insert([{
    organization_id: profile?.organization_id,
    client_id: clientId,
    channel: 'whatsapp',
    provider: 'manual',
    status: 'sent',
    scheduled_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    payload: { list, type: list === 'reminders' ? 'reminder' : 'overdue' }
  }]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
