"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { clients as demoClients } from "@/lib/demo-data";

export interface ClientItem {
  id?: string;
  name: string;
  phone: string;
  last: string;
  next: string;
  visits: number;
  spent: number;
  status: string;
  whitelist: boolean;
  tag: string;
}

export async function getClients(): Promise<ClientItem[]> {
  if (!isSupabaseConfigured()) {
    return demoClients;
  }

  const supabase = await createClient();
  if (!supabase) return demoClients;

  const { data, error } = await supabase
    .from("clients")
    .select(`
      id,
      name,
      phone,
      status,
      created_at,
      client_deposit_whitelist (
        client_id,
        removed_at
      )
    `)
    .order("name", { ascending: true });

  if (error || !data) {
    return demoClients;
  }

  return data.map((item) => {
    // Whitelist é ativa se existe registro e removed_at é nulo
    const whitelistEntry = Array.isArray(item.client_deposit_whitelist)
      ? item.client_deposit_whitelist[0]
      : item.client_deposit_whitelist;
    const isWhitelisted = Boolean(
      whitelistEntry && !whitelistEntry.removed_at
    );

    return {
      id: item.id,
      name: item.name,
      phone: item.phone,
      last: "Recente",
      next: "—",
      visits: 1,
      spent: 0,
      status: item.status === "archived" ? "Inativa" : "Ativa",
      whitelist: isWhitelisted,
      tag: isWhitelisted ? "VIP" : "Cadastrada",
    };
  });
}

export async function checkClientWhitelist(phoneNormalized: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const found = demoClients.find((c) =>
      c.phone.replace(/\D/g, "").includes(phoneNormalized.replace(/\D/g, ""))
    );
    return Boolean(found?.whitelist);
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_normalized", phoneNormalized.replace(/\D/g, ""))
    .single();

  if (!client) return false;

  const { data: whitelist } = await supabase
    .from("client_deposit_whitelist")
    .select("client_id")
    .eq("client_id", client.id)
    .is("removed_at", null)
    .maybeSingle();

  return Boolean(whitelist);
}

export async function createClientRecord(client: { name: string; phone: string; notes?: string }) {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      mode: "demo",
      data: {
        ...client,
        id: "demo-" + Date.now(),
        last: "—",
        next: "—",
        visits: 0,
        spent: 0,
        status: "Ativa",
        whitelist: false,
        tag: "Nova",
      },
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Supabase não conectado" };
  }

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) {
    return { success: false, error: "Organização não encontrada" };
  }

  const phoneNormalized = client.phone.replace(/\D/g, "");

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: profile.organization_id,
      name: client.name,
      phone: client.phone,
      phone_normalized: phoneNormalized,
      notes: client.notes || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, mode: "supabase", data };
}

export async function updateClientRecord(id: string, client: { name: string; phone: string }) {
  if (!isSupabaseConfigured() || id.startsWith("demo-")) {
    return { success: true };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  const phoneNormalized = client.phone.replace(/\D/g, "");

  const { error } = await supabase
    .from("clients")
    .update({
      name: client.name,
      phone: client.phone,
      phone_normalized: phoneNormalized,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function archiveClientRecord(id: string) {
  if (!isSupabaseConfigured() || id.startsWith("demo-")) {
    return { success: true };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Supabase não conectado" };

  const { error } = await supabase
    .from("clients")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
