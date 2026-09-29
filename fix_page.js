const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(
  '    var tenantContext = { profileName: profile?.full_name || "Usuário", orgName: organization.name };',
  ''
);

code = code.replace(
  '    if (!user) {',
  '    let tenantContext = { profileName: "Usuário", orgName: "Studio" };\n    if (!user) {'
);

code = code.replace(
  '    if (profile?.organization_id) {',
  '    tenantContext.profileName = profile?.full_name || "Usuário";\n    if (profile?.organization_id) {'
);

code = code.replace(
  '      if (org) organization = org;',
  '      if (org) tenantContext.orgName = org.name;'
);

fs.writeFileSync('src/app/page.tsx', code);
