"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";


function translateError(msg: string) {
  if (msg.includes("after") && msg.includes("seconds")) return "Por segurança, aguarde alguns segundos antes de tentar novamente.";
  if (msg.includes("different from the old")) return "A nova senha deve ser diferente da atual.";
  if (msg.includes("already registered")) return "Este e-mail já está em uso por outra conta.";
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  return "Ocorreu um erro: " + msg;
}

export async function updateOrganization(name: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return { error: "Organização não encontrada" };

  const { error } = await supabase.from('organizations').update({ name }).eq('id', profile.organization_id);
  
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateProfile(fullName: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
  
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateAuthCredentials(email?: string, password?: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const updates: any = {};
  if (email && email !== user.email) updates.email = email;
  if (password) updates.password = password;

  if (Object.keys(updates).length === 0) return { success: true };

  // Usar admin client para forçar a alteração sem enviar e-mail de confirmação
  const adminClient = await createAdminClient();
  if (!adminClient) return { error: "Service Role Key não configurada no servidor." };
  const adminAuth = adminClient.auth.admin;

  if (updates.email || updates.password) {
    const adminUpdates: any = { email_confirm: true }; // Força a confirmação do e-mail imediatamente
    if (updates.email) adminUpdates.email = updates.email;
    if (updates.password) adminUpdates.password = updates.password;

    const { error } = await adminAuth.updateUserById(user.id, adminUpdates);
    if (error) {
      if (error.message.includes("different from the old")) {
        // Ignorar se tentou colocar a mesma senha
      } else {
        return { error: translateError(error.message) };
      }
    }
  }
  
  return { success: true, message: "Acesso atualizado com sucesso!" };
}
