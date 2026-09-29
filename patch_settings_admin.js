const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');

const newAuthCode = `export async function updateAuthCredentials(email?: string, password?: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const updates: any = {};
  if (email && email !== user.email) updates.email = email;
  if (password) updates.password = password;

  if (Object.keys(updates).length === 0) return { success: true };

  // Usar admin client para forçar a alteração sem enviar e-mail de confirmação
  const adminAuth = createAdminClient().auth.admin;

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
}`;

const oldCodeRegex = /export async function updateAuthCredentials[\s\S]*?^}/m;
code = code.replace(oldCodeRegex, newAuthCode);

fs.writeFileSync('src/lib/actions/settings.ts', code);
