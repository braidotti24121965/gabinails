"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface TransactionItem {
  id: string;
  name: string; // Description
  date: string;
  category: string;
  value: number; // positive = payment, negative = expense
  status: string; // "pago" ou "pendente"
}

export interface FinancialStats {
  revenue: number;
  expenses: number;
  commissions: number;
  balance: number;
}

export async function getFinancialData() {
  if (!isSupabaseConfigured()) {
    return { transactions: [], stats: { revenue: 0, expenses: 0, commissions: 0, balance: 0 } };
  }

  const supabase = await createClient();
  if (!supabase) return { transactions: [], stats: { revenue: 0, expenses: 0, commissions: 0, balance: 0 } };

  // Get Payments
  const { data: payments } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  // Get Expenses
  const { data: expenses } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
  // Get Commissions (just to sum for stats)
  const { data: commissions } = await supabase.from("commissions").select("amount");

  const transactions: TransactionItem[] = [];
  let revenue = 0;
  let totalExpenses = 0;
  let totalCommissions = 0;

  if (payments) {
    payments.forEach(p => {
      transactions.push({
        id: p.id,
        name: `Recebimento - \${p.method.toUpperCase()}`,
        date: new Date(p.created_at).toLocaleDateString('pt-BR'),
        category: "Receita",
        value: Number(p.amount),
        status: p.status === 'paid' ? "pago" : "pendente"
      });
      if (p.status === 'paid') revenue += Number(p.amount);
    });
  }

  if (expenses) {
    expenses.forEach(e => {
      transactions.push({
        id: e.id,
        name: e.description,
        date: new Date(e.created_at).toLocaleDateString('pt-BR'),
        category: e.category,
        value: -Math.abs(Number(e.amount)),
        status: e.status === 'paid' ? "pago" : "pendente"
      });
      if (e.status === 'paid') totalExpenses += Number(e.amount);
    });
  }
  
  if (commissions) {
    commissions.forEach(c => {
      totalCommissions += Number(c.amount);
    });
  }

  // Sort by date (descending) - hacky string date sort or by id fallback
  transactions.sort((a, b) => b.id.localeCompare(a.id));

  return {
    transactions,
    stats: {
      revenue,
      expenses: totalExpenses,
      commissions: totalCommissions,
      balance: revenue - totalExpenses
    }
  };
}
