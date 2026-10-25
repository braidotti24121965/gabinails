"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthenticatedOrganizationId(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return null;
  return profile?.organization_id || null;
}

export async function getFinance(period?: string) {
  const supabase = await createClient();
  if (!supabase) return { stats: null, data: [] };

  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { stats: null, data: [] };

  let fromDate = new Date(0);
  let toDate = new Date();
  
  const now = new Date();
  if (period === 'today') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'last_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === '30days') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else {
    // all time
    fromDate = new Date(0);
    toDate = new Date(now.getFullYear() + 10, 0, 1);
  }

  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();
  
  // Regime de Caixa + Competência para Atendimentos Concluídos
  const [
    { data: payments },
    { data: expenses },
    { data: commissions },
    { data: consumptions },
    { data: appointments }
  ] = await Promise.all([
    supabase.from('payments').select('id, amount, method, status, paid_at, kind, client:clients(name)')
      .eq('organization_id', orgId)
      .gte('paid_at', fromISO).lte('paid_at', toISO)
      .order('paid_at', { ascending: false }),
    supabase.from('expenses').select('id, amount, description, status, paid_at, due_date, expense_template_id')
      .eq('organization_id', orgId)
      .eq('status', 'paid')
      .gte('paid_at', fromISO).lte('paid_at', toISO)
      .order('paid_at', { ascending: false }),
    supabase.from('commissions').select('id, amount, status, paid_at, created_at, professional:professionals(name)')
      .eq('organization_id', orgId)
      .gte('created_at', fromISO).lte('created_at', toISO)
      .order('created_at', { ascending: false }),
    supabase.from('stock_movements').select('quantity, created_at, products(unit_cost)')
      .eq('organization_id', orgId)
      .eq('movement_type', 'consumption')
      .gte('created_at', fromISO).lte('created_at', toISO),
    supabase.from('appointments').select('id, status, starts_at, actual_end_at, created_at, payments(amount, status, kind), appointment_items(unit_price, quantity, discount, surcharge)')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('starts_at', fromISO).lte('starts_at', toISO)
  ]);

  const rows: any[] = [];
  let revenue = 0;
  let expensesTotal = 0;
  let commTotal = 0;
  let consumptionCost = 0;
  const concludedAppointments = appointments?.length || 0;

  if (consumptions) {
    consumptions.forEach((c: any) => {
      const qty = Number(c.quantity || 0);
      const cost = Number(c.products?.unit_cost || 0);
      consumptionCost += (qty * cost);
    });
  }

  if (payments) {
    payments.forEach((p: any) => {
      // Receita: entrada positiva (deposit, payment, credit)
      // Estorno/chargeback: subtrai da receita
      const isIncome = ['deposit', 'payment', 'credit'].includes(p.kind);
      const isRefund  = ['refund', 'chargeback'].includes(p.kind);

      if (p.status === 'paid' && isIncome) {
        revenue += Number(p.amount);
      } else if ((p.status === 'paid' || p.status === 'refunded') && isRefund) {
        revenue -= Number(p.amount);
      }

      const d = new Date(p.paid_at || p.created_at || Date.now());
      const displayValue = isRefund ? -Number(p.amount) : Number(p.amount);
      rows.push({
        id: p.id,
        date: d.toLocaleDateString("pt-BR"),
        name: (p.kind === 'deposit' ? 'Sinal: ' : p.kind === 'refund' ? 'Estorno: ' : 'Recebimento: ') + (p.client?.name || "Desconhecido"),
        type: p.kind === 'deposit' ? 'Sinal' : p.kind === 'refund' ? 'Estorno' : 'Receita',
        method: p.method === 'pix' ? 'PIX' : p.method === 'credit' ? 'Crédito' : p.method === 'debit' ? 'Débito' : p.method === 'cash' ? 'Dinheiro' : 'Outro',
        status: p.status === 'paid' ? 'Pago' : p.status === 'refunded' ? 'Estornado' : p.status,
        value: displayValue,
        rawDate: d.toISOString()
      });
    });
  }

  // Soma receita de serviços em atendimentos concluídos sem registro equivalente em payments
  if (appointments) {
    appointments.forEach((a: any) => {
      const itemsTotal = (a.appointment_items || []).reduce((s: number, i: any) => s + (Number(i.unit_price) * Number(i.quantity || 1)) - Number(i.discount || 0) + Number(i.surcharge || 0), 0);
      const pmtsTotal = (a.payments || []).filter((p: any) => p.status === 'paid' && ['deposit', 'payment', 'credit'].includes(p.kind)).reduce((s: number, p: any) => s + Number(p.amount), 0);
      if (itemsTotal > pmtsTotal) {
        revenue += (itemsTotal - pmtsTotal);
      }
    });
  }

  if (expenses) {
    expenses.forEach((e: any) => {
      if (e.status === 'paid') {
        expensesTotal += Number(e.amount);
      }
      const d = new Date(e.paid_at || e.due_date || Date.now());
      rows.push({
        id: e.id,
        date: d.toLocaleDateString("pt-BR"),
        name: e.description,
        dueDate: e.due_date,
        templateId: e.expense_template_id,
        type: 'Despesa',
        method: '—',
        status: e.status === 'paid' ? 'Pago' : e.status === 'pending' ? 'Pendente' : e.status,
        value: -Number(e.amount),
        rawDate: d.toISOString()
      });
    });
  }

  if (commissions) {
    commissions.forEach((c: any) => {
      commTotal += Number(c.amount);
      const d = new Date(c.created_at);
      rows.push({
        id: c.id,
        date: d.toLocaleDateString("pt-BR"),
        name: 'Comissão: ' + (c.professional?.name || "Desconhecida"),
        type: 'Comissão',
        method: '—',
        status: c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : 'Gerado',
        value: -Number(c.amount),
        rawDate: c.created_at
      });
    });
  }

  rows.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

  const balance = revenue - expensesTotal - commTotal - consumptionCost;
  const netAverageTicket = concludedAppointments > 0 ? (balance / concludedAppointments) : 0;

  return {
    stats: {
      revenue,
      expenses: expensesTotal,
      commissions: commTotal,
      balance,
      consumptionCost,
      netAverageTicket
    },
    data: rows
  };
}

/**
 * Retorna o total de receita futura: soma dos valores dos serviços
 * de agendamentos ainda não concluídos com data futura.
 * Também retorna a data do último agendamento na agenda.
 */
export async function getFutureRevenue(): Promise<{
  total: number;
  lastDate: string | null;
  count: number;
}> {
  const supabase = await createClient();
  if (!supabase) return { total: 0, lastDate: null, count: 0 };

  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { total: 0, lastDate: null, count: 0 };

  const nowISO = new Date().toISOString();

  // Agendamentos futuros ativos (não concluídos, não cancelados)
  const { data: futureAppts } = await supabase
    .from('appointments')
    .select(`
      id,
      starts_at,
      discount,
      appointment_items (
        unit_price,
        quantity,
        discount,
        surcharge
      )
    `)
    .eq('organization_id', orgId)
    .in('status', ['pending', 'awaiting_deposit', 'scheduled', 'confirmed'])
    .gte('starts_at', nowISO)
    .order('starts_at', { ascending: false });

  if (!futureAppts || futureAppts.length === 0) {
    return { total: 0, lastDate: null, count: 0 };
  }

  let total = 0;
  futureAppts.forEach((appt: any) => {
    const apptDiscount = Number(appt.discount || 0);
    const itemsTotal = (appt.appointment_items || []).reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) * Number(item.quantity || 1))
        - Number(item.discount || 0)
        + Number(item.surcharge || 0);
    }, 0);
    total += Math.max(0, itemsTotal - apptDiscount);
  });

  // O último agendamento futuro (maior data)
  const lastAppt = futureAppts[0]; // já ordenado desc
  const lastDate = lastAppt
    ? new Date(lastAppt.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return { total, lastDate, count: futureAppts.length };
}

export async function reversePayment(paymentId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  const { error } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', paymentId)
    .eq('organization_id', orgId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function createExpense(description: string, amount: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };

  const { error } = await supabase.from('expenses').insert([{
    organization_id: orgId,
    description,
    category: 'Geral',
    competence_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    amount: Math.abs(amount),
    status: 'paid',
    paid_at: new Date().toISOString()
  }]);

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function getExpenseTemplates() {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { data: [], error: "Organização não encontrada" };
  const { data, error } = await supabase.from("expense_templates")
    .select("id, name, category, default_amount, active")
    .eq("organization_id", orgId).order("name");
  return { data: data || [], error: error?.message };
}

export async function saveExpenseTemplate(input: { id?: string; name: string; category?: string; defaultAmount?: number | null; active?: boolean }) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  const name = input.name.trim().replace(/\\s+/g, " ");
  if (!name || name.length > 120) return { success: false, error: "Informe uma descrição de até 120 caracteres." };
  if (input.defaultAmount != null && (!Number.isFinite(input.defaultAmount) || input.defaultAmount <= 0)) return { success: false, error: "Valor padrão inválido" };
  const payload = { name, category: (input.category || "Geral").trim() || "Geral", default_amount: input.defaultAmount ?? null, active: input.active ?? true };
  const query = input.id
    ? supabase.from("expense_templates").update(payload).eq("id", input.id).eq("organization_id", orgId)
    : supabase.from("expense_templates").insert({ ...payload, organization_id: orgId });
  const { error } = await query;
  if (error) return { success: false, error: error.code === "23505" ? "Já existe uma despesa com esse nome." : error.message };
  revalidatePath("/");
  return { success: true };
}

export async function createCatalogExpense(input: { templateId: string; amount: number; dueDate: string; paid: boolean }) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { success: false, error: "Valor ou data inválidos" };
  const { data: template, error: templateError } = await supabase.from("expense_templates")
    .select("id, name, category").eq("organization_id", orgId).eq("id", input.templateId).eq("active", true).single();
  if (templateError || !template) return { success: false, error: "Despesa cadastrada não encontrada." };
  const { error } = await supabase.from("expenses").insert({
    organization_id: orgId, expense_template_id: template.id, description: template.name,
    category: template.category, competence_date: input.dueDate, due_date: input.dueDate,
    amount: input.amount, status: input.paid ? "paid" : "pending",
    paid_at: input.paid ? new Date().toISOString() : null
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function updateExpenseRecord(input: { id: string; amount: number; dueDate: string; paid: boolean; templateId?: string }) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { success: false, error: "Valor ou data inválidos" };
  const payload: Record<string, unknown> = {
    amount: input.amount, due_date: input.dueDate, competence_date: input.dueDate,
    status: input.paid ? "paid" : "pending", paid_at: input.paid ? new Date().toISOString() : null
  };
  if (input.templateId) {
    const { data: t } = await supabase.from("expense_templates").select("id, name, category")
      .eq("organization_id", orgId).eq("id", input.templateId).eq("active", true).single();
    if (!t) return { success: false, error: "Despesa cadastrada não encontrada." };
    Object.assign(payload, { expense_template_id: t.id, description: t.name, category: t.category });
  }
  const { data, error } = await supabase.from("expenses").update(payload).eq("id", input.id)
    .eq("organization_id", orgId).select("id").maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Lançamento não encontrado." };
  revalidatePath("/");
  return { success: true };
}
