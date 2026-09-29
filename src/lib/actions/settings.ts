"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  // Update email first if present
  if (updates.email) {
    const { error } = await supabase.auth.updateUser({ email: updates.email });
    if (error) return { error: "Erro ao atualizar e-mail: " + error.message };
  }

  // Update password if present
  if (updates.password) {
    const { error } = await supabase.auth.updateUser({ password: updates.password });
    if (error) {
      if (error.message.includes("different from the old")) {
        // Ignorar se tentou colocar a mesma senha
      } else {
        return { error: "Erro ao atualizar senha: " + error.message };
      }
    }
  }
  
  return { success: true, message: updates.email ? "Por segurança, um link de confirmação foi enviado para o novo e-mail. A troca será efetivada após o clique no link." : "Senha atualizada com sucesso!" };
}
