"use server";
import { createClient } from "@/lib/supabase/server";

export async function getRemindersForTomorrow() {
  const supabase = await createClient();
  if (!supabase) return [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appts } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      status,
      client:clients(name, phone),
      professional:professionals(name),
      items:appointment_items(service:services(name))
    `)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (!appts) return [];

  return appts.map((a: any) => {
    const time = new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = new Date(a.starts_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
    const services = a.items?.map((i: any) => i.service?.name).join(" e ") || "seu procedimento";
    const firstName = a.client?.name?.split(" ")[0] || "Cliente";
    
    const message = `Oi ${firstName}, tudo bem? Aqui é do Gabi Ludwig Nails! Passando para lembrar do nosso horário agendado para o dia ${date} às ${time} para fazer ${services}. Por favor, confirme respondendo a esta mensagem. Te esperamos! 🥰`;
    
    return {
      id: a.id,
      clientName: a.client?.name || "Cliente",
      phone: a.client?.phone || "",
      time,
      services,
      message,
      sent: false
    };
  });
}
