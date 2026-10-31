"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PackageTemplateInput = {
  name: string;
  price: number;
  validityDays?: number | null;
  items: { serviceId: string; sessions: number }[];
};

export async function getPackageTemplates() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", auth.user.id).single();
  if (!profile?.organization_id) return [];
  const { data, error } = await supabase.from("package_templates")
    .select("id,name,price,validity_days,active,package_template_items(service_id,sessions)")
    .eq("organization_id", profile.organization_id).order("name");
  if (error) {
    console.error("getPackageTemplates", error.code);
    return [];
  }
  return data ?? [];
}

export async function createPackageTemplate(input: PackageTemplateInput) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Sem conexão." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { success: false, error: "Sessão expirada." };
  const { data: profile } = await supabase.from("profiles").select("organization_id,role").eq("id", auth.user.id).single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada." };
  if (!["admin", "owner", "manager"].includes(profile.role)) return { success: false, error: "Sem permissão para cadastrar pacotes." };
  const name = input.name?.trim();
  const items = input.items ?? [];
  if (!name || name.length > 120 || !Number.isFinite(input.price) || input.price <= 0 ||
      !items.length || items.some(i => !i.serviceId || !Number.isInteger(i.sessions) || i.sessions < 1 || i.sessions > 1000) ||
      new Set(items.map(i => i.serviceId)).size !== items.length ||
      (input.validityDays != null && (!Number.isInteger(input.validityDays) || input.validityDays < 1))) {
    return { success: false, error: "Confira nome, preço, validade e serviços do pacote." };
  }
  const ids = items.map(i => i.serviceId);
  const { data: services, error: serviceError } = await supabase.from("services")
    .select("id").eq("organization_id", profile.organization_id).eq("active", true).in("id", ids);
  if (serviceError || services?.length !== ids.length) return { success: false, error: "Selecione somente serviços ativos deste salão." };
  const { data: template, error } = await supabase.from("package_templates").insert({
    organization_id: profile.organization_id, name, price: input.price,
    validity_days: input.validityDays ?? null, active: false
  }).select("id").single();
  if (error || !template) return { success: false, error: "Não foi possível criar o pacote." };
  const { error: itemError } = await supabase.from("package_template_items").insert(items.map(i => ({
    organization_id: profile.organization_id, template_id: template.id,
    service_id: i.serviceId, sessions: i.sessions
  })));
  if (itemError) {
    // The draft remains inactive and cannot be sold. Never publish an incomplete package.
    return { success: false, error: "Não foi possível associar os serviços. O pacote permaneceu inativo." };
  }
  const { error: activateError } = await supabase.from("package_templates")
    .update({ active: true }).eq("id", template.id).eq("organization_id", profile.organization_id);
  if (activateError) return { success: false, error: "Pacote criado, mas ainda não foi ativado." };
  revalidatePath("/");
  return { success: true, id: template.id };
}

export async function setPackageTemplateActive(id: string, active: boolean) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Sem conexão." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { success: false, error: "Sessão expirada." };
  const { data: profile } = await supabase.from("profiles").select("organization_id,role").eq("id", auth.user.id).single();
  if (!profile?.organization_id || !["admin", "owner", "manager"].includes(profile.role)) return { success: false, error: "Sem permissão." };
  const { error } = await supabase.from("package_templates").update({ active })
    .eq("id", id).eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: "Não foi possível atualizar o pacote." };
  revalidatePath("/");
  return { success: true };
}
