const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(
  '  let tenantContext = { profileName: "Usuário", orgName: "Studio" };',
  '  let tenantContext = { profileName: "Usuário", orgName: "Studio", email: "" };'
);

code = code.replace(
  '    if (!user) {',
  '    tenantContext.email = user.email || "";\n    if (!user) {'
);

fs.writeFileSync('src/app/page.tsx', code);
