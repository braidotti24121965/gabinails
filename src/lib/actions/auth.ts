"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase não configurado" };
  }

  let { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // If login failed, check if the account is unconfirmed in Supabase and confirm it automatically
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const adminClient = await createAdminClient();
      if (adminClient) {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === email?.toLowerCase()
        );
        if (existingUser && !existingUser.email_confirmed_at) {
          await adminClient.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
          const retry = await supabase.auth.signInWithPassword({ email, password });
          error = retry.error;
        }
      }
    } catch {
      // Ignore fallback errors and return standard user message
    }
  }

  if (error) {
    return { error: "Credenciais inválidas. Verifique seu e-mail e senha." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function register(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const orgName = (formData.get("orgName") as string)?.trim();
  
  if (!email || !password || !fullName || !orgName) {
    return { error: "Preencha todos os campos." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado" };

  // 1. Create the user using standard client
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (authError) {
    return { error: "Erro ao criar conta: " + authError.message };
  }

  const user = authData.user;
  if (!user) {
    return { error: "Não foi possível criar o usuário." };
  }

  // 2. We use admin client to set up Org and Profile bypassing RLS, and confirm user email
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminClient = await createAdminClient();
  
  if (adminClient) {
    // Auto-confirm user email so login works immediately without requiring email confirmation link
    await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true });

    // Create new organization
    const { data: org } = await adminClient.from('organizations').insert([{
      name: orgName,
      slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      timezone: 'America/Sao_Paulo'
    }]).select('id').single();

    if (org?.id) {
      // Check if profile exists (from trigger)
      const { data: existingProfile } = await adminClient.from('profiles').select('id').eq('id', user.id).single();
      
      if (existingProfile) {
        // Update
        await adminClient.from('profiles').update({
          organization_id: org.id,
          full_name: fullName,
          role: 'owner'
        }).eq('id', user.id);
      } else {
        // Insert
        await adminClient.from('profiles').insert([{
          id: user.id,
          organization_id: org.id,
          full_name: fullName,
          role: 'owner'
        }]);
      }
    }
  }

  redirect("/");
}
