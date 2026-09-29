const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const target = '  // Protect route\\n  if (supabase) {';
const fix = '  // Protect route\\n  let tenantContext = { profileName: "Usuário", orgName: "Studio" };\\n  if (supabase) {';

code = code.replace(
  '  // Protect route\n  if (supabase) {',
  '  // Protect route\n  let tenantContext = { profileName: "Usuário", orgName: "Studio" };\n  if (supabase) {'
);

code = code.replace(
  '    let tenantContext = { profileName: "Usuário", orgName: "Studio" };\n',
  ''
);

fs.writeFileSync('src/app/page.tsx', code);
