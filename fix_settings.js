const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');

const errorMapCode = `
function translateError(msg: string) {
  if (msg.includes("after") && msg.includes("seconds")) return "Por segurança, aguarde alguns segundos antes de tentar novamente.";
  if (msg.includes("different from the old")) return "A nova senha deve ser diferente da atual.";
  if (msg.includes("already registered")) return "Este e-mail já está em uso por outra conta.";
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  return "Ocorreu um erro: " + msg;
}
`;

code = code.replace(
  'export async function updateOrganization',
  errorMapCode + '\nexport async function updateOrganization'
);

code = code.replace(
  'if (error) return { error: "Erro ao atualizar e-mail: " + error.message };',
  'if (error) return { error: translateError(error.message) };'
);

code = code.replace(
  'return { error: "Erro ao atualizar senha: " + error.message };',
  'return { error: translateError(error.message) };'
);

fs.writeFileSync('src/lib/actions/settings.ts', code);
