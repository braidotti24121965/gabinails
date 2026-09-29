const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');

code = code.replace(
  '  if (Object.keys(updates).length === 0) return { success: true };\n\n  const { error } = await supabase.auth.updateUser(updates);\n  \n  if (error) return { error: error.message };',
  `  if (Object.keys(updates).length === 0) return { success: true };

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
  }`
);

fs.writeFileSync('src/lib/actions/settings.ts', code);
