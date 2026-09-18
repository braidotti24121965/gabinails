"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFinance() {
  const supabase = await createClient();
  if (!supabase) return { stats: null, data: [] };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { stats: null, data: [] };

  const [
    { data: payments },
    { data: expenses },
    { data: commissions }
  ] = await Promise.all([
    supabase.from('payments').select('id, amount, method, status, created_at, kind, client:clients(name)').order('created_at', { ascending: false }),
    supabase.from('expenses').select('id, amount, description, status, created_at, due_date').order('created_at', { ascending: false }),
    supabase.from('commissions').select('id, amount, status, created_at, professional:professionals(name)').order('created_at', { ascending: false })
  ]);

  const rows: any[] = [];
  let revenue = 0;
  let expensesTotal = 0;
  let commTotal = 0;

  if (payments) {
    payments.forEach((p: any) => {
      revenue += Number(p.amount);
      const d = new Date(p.created_at);
      rows.push({
        id: p.id,
        date: d.toLocaleDateString("pt-BR"),
        name: (p.kind === 'deposit' ? 'Sinal: ' : 'Recebimento: ') + (p.client?.name || "Desconhecido"),
        type: p.kind === 'deposit' ? 'Sinal' : 'Receita',
        method: p.method === 'pix' ? 'PIX' : p.method === 'credit' ? 'Crédito' : p.method === 'debit' ? 'Débito' : p.method === 'cash' ? 'Dinheiro' : 'Outro',
        status: p.status === 'paid' ? 'Pago' : p.status === 'refunded' ? 'Estornado' : p.status,
        value: Number(p.amount),
        rawDate: p.created_at
      });
    });
  }

  if (expenses) {
    expenses.forEach((e: any) => {
      expensesTotal += Number(e.amount);
      const d = new Date(e.created_at);
      rows.push({
        id: e.id,
        date: d.toLocaleDateString("pt-BR"),
        name: e.description,
        type: 'Despesa',
        method: '—',
        status: e.status === 'paid' ? 'Pago' : e.status === 'pending' ? 'Pendente' : e.status,
        value: -Number(e.amount),
        rawDate: e.created_at
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

  return {
    stats: {
      revenue,
      expenses: expensesTotal,
      commissions: commTotal,
      balance: revenue - expensesTotal - commTotal
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
