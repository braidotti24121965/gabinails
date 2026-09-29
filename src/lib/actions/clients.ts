"use server";
import { uploadClientPhotoService, deleteClientPhotoService, generateSignedUrlsService } from "../services/photos.service.ts";
import { revalidatePath } from "next/cache";

import { createClient, isSupabaseConfigured } from "../supabase/server.ts";
import { clients as demoClients } from "../demo-data.ts";
import { createClientRecordService, updateClientRecordService } from "../services/clients.service.ts";

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
  activePackages?: number;
  packageCredits?: number;
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
        starts_at,
        payments (
          amount
        )
      ),
      client_deposit_whitelist (
        client_id,
        removed_at
      ),
      packages (
        status,
        remaining_sessions
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
      last: (() => {
        const past = item.appointments?.filter(a => a.status === 'completed' && new Date(a.starts_at) <= new Date()).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0];
        if (!past) return "—";
        const diff = Math.floor((new Date().getTime() - new Date(past.starts_at).getTime()) / (1000 * 3600 * 24));
        if (diff === 0) return "Hoje";
        if (diff === 1) return "Ontem";
        return new Date(past.starts_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
      })(),
      next: (() => {
        const future = item.appointments?.filter(a => ['pending', 'scheduled', 'confirmed', 'awaiting_deposit'].includes(a.status) && new Date(a.starts_at) >= new Date()).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
        if (!future) return "—";
        const diff = Math.floor((new Date(future.starts_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (diff === 0) return "Hoje";
        if (diff === 1) return "Amanhã";
        return new Date(future.starts_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
      })(),
      visits: item.appointments?.filter(a => a.status === 'completed').length || 0,
      spent: item.appointments?.reduce((acc, a) => acc + (a.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0), 0) || 0,
      status: item.status === "archived" ? "Inativa" : "Ativa",
      whitelist: isWhitelisted,
      tag: isWhitelisted ? "VIP" : "Cadastrada",
      activePackages: item.packages?.filter(p => p.status === 'active' && p.remaining_sessions > 0).length || 0,
      packageCredits: item.packages?.filter(p => p.status === 'active').reduce((acc, p) => acc + (p.remaining_sessions || 0), 0) || 0,
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
  if (!isSupabaseConfigured() || client.phone.startsWith("demo-")) {
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
  return createClientRecordService(supabase, client);
}

export async function updateClientRecord(id: string, client: { name: string; phone: string; notes?: string; birthDate?: string; cep?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }) {
  if (!isSupabaseConfigured() || id.startsWith("demo-")) return { success: true };
  const supabase = await createClient();
  return updateClientRecordService(supabase, id, client);
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



export type ClientHistoryItem = {
  id: string;
  date: string;
  time: string;
  status: string;
  professional: string;
  services: string;
  paid: number;
};

export type ClientPhotoItem = {
  id: string;
  kind: string;
  created_at: string;
  url: string | null;
};

export type ClientDetailsResponse = {
  client: { id: string; name: string; phone: string; notes: string | null; created_at: string };
  stats: { visits: number; spent: number; memberSince: string };
  history: ClientHistoryItem[];
  photos: ClientPhotoItem[];
} | null;

export async function getClientDetails(clientId: string): Promise<ClientDetailsResponse> {
  if (clientId.startsWith("demo-")) {
    const demoClient = demoClients.find(c => c.id === clientId);
    if (!demoClient) return null;
    return {
      client: { id: clientId, name: demoClient.name, phone: demoClient.phone, notes: "", created_at: new Date().toISOString() },
      stats: { visits: demoClient.visits, spent: demoClient.spent, memberSince: "14/09/2026" },
      history: [],
      photos: []
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, phone, notes, created_at")
    .eq("id", clientId)
    .single();

  if (!client) return null;

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
  const history: ClientHistoryItem[] = (appts || []).map((a: any) => {
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

  const { data: dbPhotos } = await supabase
    .from("client_photos")
    .select("id, kind, storage_path, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  let photos: ClientPhotoItem[] = [];
  if (dbPhotos && dbPhotos.length > 0) {
    photos = await generateSignedUrlsService(supabase, dbPhotos);
  }

  return {
    client,
    stats: {
      visits: appts?.filter((a: any) => a.status === 'completed').length || 0,
      spent: totalSpent,
      memberSince: new Date(client.created_at).toLocaleDateString("pt-BR")
    },
    history,
    photos
  };
}

export async function uploadClientPhoto(formData: FormData) {
  const file = formData.get('file') as File;
  const clientId = formData.get('clientId') as string;
  const kind = formData.get('kind');

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Serviço indisponível." };

  const res = await uploadClientPhotoService({ supabase, file, clientId, kind });
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export async function deleteClientPhoto(photoId: string) {
  if (photoId.startsWith("mock-")) return { success: true };

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Serviço indisponível." };
  }

  const result = await deleteClientPhotoService(supabase, photoId);

  if (result.success) {
    revalidatePath("/");
  }

  return result;
}

export async function getClientAnamnesis(clientId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from('client_anamnesis').select('*').eq('client_id', clientId).single();
  return data;
}
