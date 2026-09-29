"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFinance(period?: string) {
  const supabase = await createClient();
  if (!supabase) return { stats: null, data: [] };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { stats: null, data: [] };

  let fromDate = new Date(0);
  let toDate = new Date();
  
  if (period === 'today') {
    fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    fromDate = new Date();
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);
  }

  const fromISO = fromDate.toISOString();
  
  // Regime de Caixa: usar paid_at
  const [
    { data: payments },
    { data: expenses },
    { data: commissions },
    { data: consumptions },
    { data: appointments }
  ] = await Promise.all([
    supabase.from('payments').select('id, amount, method, status, paid_at, kind, client:clients(name)')
      .gte('paid_at', fromISO)
      .order('paid_at', { ascending: false }),
    supabase.from('expenses').select('id, amount, description, status, paid_at, due_date')
      .eq('status', 'paid')
      .gte('paid_at', fromISO)
      .order('paid_at', { ascending: false }),
    supabase.from('commissions').select('id, amount, status, created_at, professional:professionals(name)')
      .gte('created_at', fromISO)
      .order('created_at', { ascending: false }),
    supabase.from('stock_movements').select('quantity, created_at, products(unit_cost)')
      .eq('movement_type', 'consumption')
      .gte('created_at', fromISO),
    supabase.from('appointments').select('id, status, created_at')
      .eq('status', 'completed')
      .gte('created_at', fromISO)
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
      if (p.status === 'paid') {
        revenue += Number(p.amount);
      }
      const d = new Date(p.paid_at || p.created_at || Date.now());
      rows.push({
        id: p.id,
        date: d.toLocaleDateString("pt-BR"),
        name: (p.kind === 'deposit' ? 'Sinal: ' : 'Recebimento: ') + (p.client?.name || "Desconhecido"),
        type: p.kind === 'deposit' ? 'Sinal' : 'Receita',
        method: p.method === 'pix' ? 'PIX' : p.method === 'credit' ? 'Crédito' : p.method === 'debit' ? 'Débito' : p.method === 'cash' ? 'Dinheiro' : 'Outro',
        status: p.status === 'paid' ? 'Pago' : p.status === 'refunded' ? 'Estornado' : p.status,
        value: Number(p.amount),
        rawDate: d.toISOString()
      });
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

export async function reversePayment(paymentId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('payments').update({ status: 'refunded' }).eq('id', paymentId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function createExpense(description: string, amount: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  const { error } = await supabase.from('expenses').insert([{
    organization_id: profile.organization_id,
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
