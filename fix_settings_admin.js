const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');

code = code.replace(
  'const adminAuth = createAdminClient().auth.admin;',
  'const adminClient = await createAdminClient();\n  if (!adminClient) return { error: "Service Role Key não configurada no servidor." };\n  const adminAuth = adminClient.auth.admin;'
);

fs.writeFileSync('src/lib/actions/settings.ts', code);
