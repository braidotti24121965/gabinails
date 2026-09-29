const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '{titles[view][0]}',
  '{view === "dashboard" ? `Bom dia, ${tenant.profileName.split(" ")[0]}` : titles[view][0]}'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
