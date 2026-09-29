"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sellPackage(clientId: string, name: string, totalSessions: number, price: number, method: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  
  // 1. Fetch client to update notes
  const { data: client } = await supabase.from('clients').select('notes').eq('id', clientId).single();
  let parsedNotes: any = { text: "" };
  try {
    if (client?.notes?.startsWith("{")) parsedNotes = JSON.parse(client.notes);
    else parsedNotes.text = client?.notes || "";
  } catch(e) {}
  
  if (!parsedNotes.packages) parsedNotes.packages = [];
  
  parsedNotes.packages.push({
    id: Date.now().toString(),
    name,
    total: totalSessions,
    used: 0,
    created_at: new Date().toISOString()
  });

  // 2. Update client
  await supabase.from('clients').update({ notes: JSON.stringify(parsedNotes) }).eq('id', clientId);

  // 3. Create payment
  await supabase.from('payments').insert([{
    organization_id: profile?.organization_id,
    client_id: clientId,
    kind: 'package',
    method: method,
    amount: price,
    status: 'paid',
    paid_at: new Date().toISOString()
  }]);

  revalidatePath("/");
  return { success: true };
}

export async function deductPackage(clientId: string, packageId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: client } = await supabase.from('clients').select('notes').eq('id', clientId).single();
  if (!client || !client.notes?.startsWith("{")) return { success: false };
  
  const parsed = JSON.parse(client.notes);
  if (!parsed.packages) return { success: false };
  
  const pkg = parsed.packages.find((p: any) => p.id === packageId);
  if (pkg) {
    pkg.used += 1;
    await supabase.from('clients').update({ notes: JSON.stringify(parsed) }).eq('id', clientId);
  }
  
  return { success: true };
}
