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
  if (period?.startsWith('month:') && /^month:\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.slice(6).split('-').map(Number);
    fromDate = new Date(year, month - 1, 1, 0, 0, 0);
    toDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else if (period === 'today') {
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
    { data: paidExpenses },
    { data: pendingExpenses },
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
    supabase.from('expenses').select('id, amount, description, status, paid_at, due_date, expense_template_id')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .gte('due_date', fromDate.toLocaleDateString('en-CA')).lte('due_date', toDate.toLocaleDateString('en-CA'))
      .order('due_date', { ascending: false }),
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
  let pendingExpensesTotal = 0;
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

  const expenses = [...(paidExpenses || []), ...(pendingExpenses || [])];
  if (expenses.length) {
    expenses.forEach((e: any) => {
      if (e.status === 'paid') {
        expensesTotal += Number(e.amount);
      } else if (e.status === 'pending') {
        pendingExpensesTotal += Number(e.amount);
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
      pendingExpenses: pendingExpensesTotal,
      totalRegisteredExpenses: expensesTotal + pendingExpensesTotal,
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
export async function getFutureRevenue(period: string = "month"): Promise<{
  total: number;
  lastDate: string | null;
  count: number;
}> {
  const supabase = await createClient();
  if (!supabase) return { total: 0, lastDate: null, count: 0 };

  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { total: 0, lastDate: null, count: 0 };

  const nowISO = new Date().toISOString();
  const today = new Date();
  let periodEnd: string | null = null;
  if (period === 'today') periodEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  else if (period === 'month') periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();
  else if (period === 'last_month') periodEnd = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  else if (period === '30days') periodEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
  else if (/^month:\\d{4}-\\d{2}$/.test(period)) { const [y,m] = period.slice(6).split('-').map(Number); periodEnd = new Date(y,m,1).toISOString(); }

  // Agendamentos futuros ativos (não concluídos, não cancelados)
  let futureQuery = supabase
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
    .gte('starts_at', nowISO);
  if (periodEnd) futureQuery = futureQuery.lt('starts_at', periodEnd);
  const { data: futureAppts } = await futureQuery.order('starts_at', { ascending: false });

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
    .select("id, name, category, default_amount, active, recurring_monthly, recurring_day")
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


function isoDate(year: number, month: number, day: number) {
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}

/** Gera uma janela de 12 meses, idempotente, somente para modelos ativos e configurados. */
export async function ensureRecurringExpenses() {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  const { data: templates, error } = await supabase.from("expense_templates")
    .select("id,name,category,default_amount,recurring_day")
    .eq("organization_id", orgId).eq("active", true).eq("recurring_monthly", true);
  if (error) return { success: false, error: error.message };
  const now = new Date();
  const { data: existing, error: existingError } = await supabase.from("expenses")
    .select("expense_template_id,due_date").eq("organization_id", orgId);
  if (existingError) return { success: false, error: existingError.message };
  const existingKeys = new Set((existing || []).map(x => `${x.expense_template_id}|${x.due_date}`));
  const rows: Record<string, unknown>[] = [];
  for (const t of templates || []) {
    if (!t.recurring_day || Number(t.default_amount) <= 0) continue;
    for (let offset = 0; offset < 12; offset++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      const due = isoDate(d.getUTCFullYear(), d.getUTCMonth(), t.recurring_day);
      if (existingKeys.has(`${t.id}|${due}`)) continue;
      rows.push({ organization_id: orgId, recurring_template_id: t.id, expense_template_id: t.id,
        description: t.name, category: t.category, amount: t.default_amount,
        due_date: due, competence_date: due, status: "pending" });
    }
  }
  // Um índice único protege contra duplicações em chamadas simultâneas.
  if (rows.length) {
    const { error: insertError } = await supabase.from("expenses")
      .upsert(rows, { onConflict: "organization_id,recurring_template_id,due_date", ignoreDuplicates: true });
    if (insertError) return { success: false, error: insertError.message };
  }
  revalidatePath("/");
  return { success: true, generatedWindow: rows.length };
}

export async function getPayablesAndCategories(period?: string) {
  const supabase = await createClient();
  if (!supabase) return { payables: [], categories: [], error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { payables: [], categories: [], error: "Organização não encontrada" };
  const { data, error } = await supabase.from("expenses")
    .select("id,description,category,amount,due_date,paid_at,status")
    .eq("organization_id", orgId).order("due_date", { ascending: true });
  if (error) return { payables: [], categories: [], error: error.message };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const inSeven = new Date(today + "T12:00:00Z");
  inSeven.setUTCDate(inSeven.getUTCDate() + 7);
  const seven = inSeven.toISOString().slice(0, 10);
  const payables = (data || []).filter(x => x.status === "pending" && (period === "all" || (() => { const d = x.due_date; if (period === "today") return d === today; if (period === "month") return d.startsWith(today.slice(0,7)); if (period === "last_month") { const dt = new Date(today+"T12:00:00Z"); dt.setUTCMonth(dt.getUTCMonth()-1); return d.startsWith(dt.toISOString().slice(0,7)); } if (period === "30days") { const dt = new Date(today+"T12:00:00Z"); dt.setUTCDate(dt.getUTCDate()-30); return d >= dt.toISOString().slice(0,10) && d <= today; } if (period?.startsWith("month:")) return d.startsWith(period.slice(6)); return true; })())).map(x => ({
    ...x, alert: x.due_date < today ? "overdue" : x.due_date <= seven ? "soon" : "future"
  }));
  const now = new Date();
  const periodDate = (d: string) => {
    if (period === "all") return true;
    const date = d.slice(0, 10);
    if (period?.startsWith("month:") && /^month:\d{4}-\d{2}$/.test(period)) return date.startsWith(period.slice(6));
    if (period === "today") return date === today;
    if (period === "last_month") {
      const start = isoDate(now.getFullYear(), now.getMonth() - 1, 1);
      const end = isoDate(now.getFullYear(), now.getMonth(), 1);
      return date >= start && date < end;
    }
    if (period === "30days") {
      const start = new Date(today + "T12:00:00Z"); start.setUTCDate(start.getUTCDate() - 30);
      return date >= start.toISOString().slice(0, 10) && date <= today;
    }
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}`;
    return date.startsWith(prefix);
  };
  const map = new Map<string, {category: string; paid: number; pending: number; expenses: {id:string; description:string; amount:number; status:string; due_date:string}[]}>();
  for (const e of data || []) {
    const effectiveDate = e.status === "paid" ? e.paid_at || e.due_date : e.due_date;
    if (!periodDate(effectiveDate)) continue;
    const key = e.category || "Geral";
    const current = map.get(key) || { category: key, paid: 0, pending: 0, expenses: [] as {id:string; description:string; amount:number; status:string; due_date:string}[] };
    if (e.status === "paid") current.paid += Number(e.amount);
    if (e.status === "pending") current.pending += Number(e.amount);
    current.expenses.push({id:e.id,description:e.description || "Despesa sem descrição",amount:Number(e.amount),status:e.status,due_date:e.due_date});
    map.set(key, current);
  }
  return { payables, categories: Array.from(map.values()).sort((a,b) => (b.paid+b.pending)-(a.paid+a.pending)) };
}

export async function markExpensePaid(id: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const { data, error } = await supabase.from("expenses")
    .update({ status: "paid", paid_at: today }).eq("id", id)
    .eq("organization_id", orgId).eq("status", "pending").select("id").maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Despesa já paga ou não encontrada" };
  revalidatePath("/");
  return { success: true };
}

export async function saveRecurringExpense(input: {templateId: string; enabled: boolean; day: number; amount: number}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Banco indisponível" };
  const orgId = await getAuthenticatedOrganizationId(supabase);
  if (!orgId) return { success: false, error: "Organização não encontrada" };
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31 ||
    (input.enabled && (!Number.isFinite(input.amount) || input.amount <= 0)))
    return { success: false, error: "Dia ou valor mensal inválido" };
  const { data, error } = await supabase.from("expense_templates")
    .update({ recurring_monthly: input.enabled, recurring_day: input.enabled ? input.day : null,
      ...(input.enabled ? {default_amount: input.amount} : {}) })
    .eq("id", input.templateId).eq("organization_id", orgId).select("id").maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Cadastro não encontrado" };
  if (input.enabled) return ensureRecurringExpenses();
  revalidatePath("/");
  return { success: true };
}
