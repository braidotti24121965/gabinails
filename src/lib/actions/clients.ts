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
      notes,
      birth_date,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      created_at,
      appointments (
        status,
        payments (
          amount
        )
      ),
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
      notes: item.notes,
      birthDate: item.birth_date,
      cep: item.cep,
      street: item.street,
      number: item.number,
      complement: item.complement,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      last: "Recente",
      next: "—",
      visits: item.appointments?.filter(a => a.status === 'completed').length || 0,
      spent: item.appointments?.reduce((acc, a) => acc + (a.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0), 0) || 0,
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

export async function createClientRecord(client: { name: string; phone: string; notes?: string; birthDate?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) {
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
      birth_date: client.birthDate || null,
      cep: client.cep || null,
      street: client.street || null,
      number: client.number || null,
      complement: client.complement || null,
      neighborhood: client.neighborhood || null,
      city: client.city || null,
      state: client.state || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, mode: "supabase", data };
}

export async function updateClientRecord(id: string, client: { name: string; phone: string; notes?: string; birthDate?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) {
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
      notes: client.notes || null,
      birth_date: client.birthDate || null,
      cep: client.cep || null,
      street: client.street || null,
      number: client.number || null,
      complement: client.complement || null,
      neighborhood: client.neighborhood || null,
      city: client.city || null,
      state: client.state || null,
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


export async function getClientDetails(clientId: string) {
  if (clientId.startsWith("demo-")) {
    return {
      client: { id: clientId, name: demoClients.find(c => c.id === clientId)?.name || "Cliente Demo", phone: demoClients.find(c => c.id === clientId)?.phone || "", notes: "", created_at: new Date().toISOString() },
      stats: { visits: demoClients.find(c => c.id === clientId)?.visits || 0, spent: demoClients.find(c => c.id === clientId)?.spent || 0, memberSince: "14/09/2026" },
      history: [],
      photos: []
    };
  }

  const supabase = await createClient();

  if (!supabase) return null;

  // 1. Get Client Info & Stats
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, phone, notes, created_at")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  // 2. Get Appointments History
  const { data: appts } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      status,
      professional:professionals(name),
      items:appointment_items(service:services(name)),
      payments(amount)
    `)
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false });

  let totalSpent = 0;
  const history = (appts || []).map((a: any) => {
    const paid = a.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    totalSpent += paid;
    return {
      id: a.id,
      date: new Date(a.starts_at).toLocaleDateString("pt-BR"),
      time: new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: a.status === 'completed' ? 'Concluído' : a.status === 'cancelled' ? 'Cancelado' : 'Agendado',
      professional: a.professional?.name || "Gabi",
      services: a.items?.map((i: any) => i.service?.name).join(" + ") || "Serviço",
      paid
    };
  });

  // 3. Get Photos
  const { data: photos } = await supabase
    .from("client_photos")
    .select("id, kind, storage_path, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return {
    client,
    stats: {
      visits: appts?.filter((a: any) => a.status === 'completed').length || 0,
      spent: totalSpent,
      memberSince: new Date(client.created_at).toLocaleDateString("pt-BR")
    },
    history,
    photos: photos || []
  };
}

export async function uploadClientPhoto(clientId: string, base64Image: string, kind: 'before' | 'after' | 'other') {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  // For MVP, since we don't have a storage bucket set up via migrations, 
  // we'll just store the base64 string directly in the storage_path column!
  const { error } = await supabase
    .from('client_photos')
    .insert([{
      organization_id: profile.organization_id,
      client_id: clientId,
      kind,
      storage_path: base64Image
    }]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
