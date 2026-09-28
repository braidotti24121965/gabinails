"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReports() {
  const supabase = await createClient();
  if (!supabase) return { error: "Sem conexão com o banco de dados" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { error: "Organização não encontrada" };

  const orgId = profile.organization_id;

  // 1. Top 5 Clients by Visits and Spent
  // We'll fetch all completed appointments to calculate this
  const { data: appointments } = await supabase
    .from("appointments")
    .select("client_id, status, clients(name, phone), payments(amount)")
    .eq("organization_id", orgId)
    .eq("status", "completed");

  const clientStats: Record<string, { name: string; visits: number; spent: number }> = {};
  
  if (appointments) {
    appointments.forEach((app: any) => {
      if (!app.client_id) return;
      if (!clientStats[app.client_id]) {
        clientStats[app.client_id] = { 
          name: app.clients?.name || "Desconhecido", 
          visits: 0, 
          spent: 0 
        };
      }
      
      clientStats[app.client_id].visits += 1;
      
      if (app.payments && app.payments.length > 0) {
        app.payments.forEach((p: any) => {
          clientStats[app.client_id].spent += Number(p.amount || 0);
        });
      }
    });
  }

  const clientsArray = Object.values(clientStats);
  const topClientsByVisits = [...clientsArray].sort((a, b) => b.visits - a.visits).slice(0, 5);
  const topClientsBySpent = [...clientsArray].sort((a, b) => b.spent - a.spent).slice(0, 5);

  // 2. Schedule Analytics (All appointments, not just completed)
  const { data: allAppointments } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("organization_id", orgId)
    .not("status", "eq", "cancelled");

  const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const hourCounts: Record<number, number> = {};

  if (allAppointments) {
    allAppointments.forEach((app: any) => {
      if (!app.starts_at) return;
      const d = new Date(app.starts_at);
      const day = d.getDay(); // 0 = Sunday
      const hour = d.getHours();
      
      dayCounts[day] += 1;
      if (!hourCounts[hour]) hourCounts[hour] = 0;
      hourCounts[hour] += 1;
    });
  }

  const daysMap = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const busiestDays = Object.entries(dayCounts)
    .map(([day, count]) => ({ day: daysMap[Number(day)], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
    
  const busiestHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: `${hour.padStart(2, '0')}:00`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Consumption Analytics
  // Get all consumption movements
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("product_id, quantity, created_at, appointment_item_id, appointment_items(appointment_id), products(name, unit_cost, base_unit)")
    .eq("organization_id", orgId)
    .eq("movement_type", "consumption");

  const productConsumption: Record<string, { name: string; quantity: number; cost: number; unit: string }> = {};
  let totalConsumptionCost = 0;
  
  // Group by appointment
  const appointmentConsumption: Record<string, { appointment_id: string; date: string; cost: number; items: string[] }> = {};

  if (movements) {
    movements.forEach((m: any) => {
      const prodId = m.product_id;
      const qty = Number(m.quantity || 0);
      const unitCost = Number(m.products?.unit_cost || 0);
      const cost = qty * unitCost;
      const name = m.products?.name || "Desconhecido";
      
      totalConsumptionCost += cost;

      if (!productConsumption[prodId]) {
        productConsumption[prodId] = { name, quantity: 0, cost: 0, unit: m.products?.base_unit || "un" };
      }
      productConsumption[prodId].quantity += qty;
      productConsumption[prodId].cost += cost;

      // Appointment grouping
      const appId = m.appointment_items?.appointment_id;
      if (appId) {
        if (!appointmentConsumption[appId]) {
          appointmentConsumption[appId] = {
            appointment_id: appId,
            date: m.created_at,
            cost: 0,
            items: []
          };
        }
        appointmentConsumption[appId].cost += cost;
        appointmentConsumption[appId].items.push(`${qty} ${m.products?.base_unit || 'un'} ${name}`);
      }
    });
  }

  const topProducts = Object.values(productConsumption)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Enrich appointment consumption with client names
  const recentAppointmentConsumption = Object.values(appointmentConsumption)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
    
  // Fetch names for these specific appointments
  if (recentAppointmentConsumption.length > 0) {
    const appIds = recentAppointmentConsumption.map(a => a.appointment_id);
    const { data: appsData } = await supabase
      .from("appointments")
      .select("id, starts_at, clients(name)")
      .in("id", appIds);
      
    if (appsData) {
      recentAppointmentConsumption.forEach(ac => {
        const match = appsData.find(ad => ad.id === ac.appointment_id);
        if (match) {
          ac.date = match.starts_at;
          const c = match.clients as any;
          (ac as any).client_name = (Array.isArray(c) ? c[0]?.name : c?.name) || "Desconhecido";
        }
      });
    }
  }

  return {
    topClientsByVisits,
    topClientsBySpent,
    busiestDays,
    busiestHours,
    totalConsumptionCost,
    topProducts,
    recentAppointmentConsumption
  };
}
