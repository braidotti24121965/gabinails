"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfessionalCommissions(profId: string) {
  const supabase = await createClient();
  if (!supabase) return { commissions: [], stats: { pending: 0, paid: 0 } };

  const { data, error } = await supabase
    .from("commissions")
    .select(`
      id,
      amount,
      status,
      created_at,
      appointment_item:appointment_items(
        id,
        service:services(name)
      )
    `)
    .eq("professional_id", profId)
    .order("created_at", { ascending: false });

  if (error || !data) return { commissions: [], stats: { pending: 0, paid: 0 } };

  let pending = 0;
  let paid = 0;

  const commissions = data.map((c: any) => {
    if (c.status === 'generated') pending += Number(c.amount);
    if (c.status === 'paid') paid += Number(c.amount);

    return {
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      date: new Date(c.created_at).toLocaleDateString("pt-BR"),
      service: c.appointment_item?.service?.name || "Serviço"
    };
  });

  return { commissions, stats: { pending, paid } };
}

export async function payCommissions(profId: string, commissionIds: string[], totalAmount: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  // Update commissions to paid
  const { error: commErr } = await supabase
    .from("commissions")
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .in('id', commissionIds);

  if (commErr) return { success: false, error: commErr.message };

  // Create an expense record for the payout
  const { data: prof } = await supabase.from('professionals').select('name').eq('id', profId).single();
  const profName = prof?.name || "Profissional";

  await supabase
    .from('expenses')
    .insert([{
      organization_id: profile.organization_id,
      description: `Pagamento de comissões - ${profName}`,
      category: 'Comissões',
      competence_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      paid_at: new Date().toISOString().split('T')[0], // Paid immediately
      amount: totalAmount,
      status: 'paid'
    }]);

  revalidatePath("/");
  return { success: true };
}
