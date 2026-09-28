const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

const newFunc = `
export async function getOverdueMaintenances() {
  const supabase = await createClient();
  if (!supabase) return [];

  // 1. Get all completed appointments with their services
  const { data: pastAppts } = await supabase
    .from("appointments")
    .select(\`
      id,
      starts_at,
      client_id,
      client:clients(name, phone),
      items:appointment_items(service:services(name))
    \`)
    .eq("status", "completed")
    .order("starts_at", { ascending: false });

  if (!pastAppts) return [];

  // 2. Get all future appointments
  const { data: futureAppts } = await supabase
    .from("appointments")
    .select("client_id")
    .in("status", ["scheduled", "confirmed"])
    .gte("starts_at", new Date().toISOString());

  const futureClientIds = new Set((futureAppts || []).map(a => a.client_id));

  // 3. Find the most recent maintenance for each client
  const latestMaintenanceByClient = new Map();
  const keywords = ["alongamento", "manutenção", "fibra", "gel", "acrílico"];

  pastAppts.forEach(app => {
    if (!app.client_id) return;
    
    // Check if this appointment had a maintenance service
    const hasMaintenance = app.items?.some((i: any) => {
      const name = i.service?.name?.toLowerCase() || "";
      return keywords.some(k => name.includes(k));
    });

    if (hasMaintenance && !latestMaintenanceByClient.has(app.client_id)) {
      latestMaintenanceByClient.set(app.client_id, app);
    }
  });

  // 4. Filter those older than 20 days and without future appointments
  const thresholdDays = 20;
  const now = new Date();
  const overdue: any[] = [];

  for (const [clientId, app] of latestMaintenanceByClient.entries()) {
    if (futureClientIds.has(clientId)) continue; // They already have a future booking

    const apptDate = new Date(app.starts_at);
    const diffTime = Math.abs(now.getTime() - apptDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= thresholdDays) {
      const firstName = app.client?.name?.split(" ")[0] || "Cliente";
      const services = app.items?.map((i: any) => i.service?.name).join(" e ") || "unhas";
      
      const message = \`Oi \${firstName}, tudo bem? Aqui é do Gabi Ludwig Nails! Vi que já faz \${diffDays} dias desde a sua última vez aqui para fazer \${services}. Para garantir que suas unhas fiquem sempre lindas e intactas, que tal agendarmos a sua manutenção para essa semana? 🥰\`;

      overdue.push({
        id: app.id,
        clientId,
        clientName: app.client?.name || "Cliente",
        phone: app.client?.phone || "",
        daysSince: diffDays,
        lastService: services,
        lastDate: apptDate.toLocaleDateString("pt-BR"),
        message,
        sent: false
      });
    }
  }

  return overdue.sort((a, b) => b.daysSince - a.daysSince); // Most overdue first
}
`;

code += newFunc;
fs.writeFileSync('src/lib/actions/automations.ts', code);
