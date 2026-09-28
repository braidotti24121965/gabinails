const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

code = code.replace(
  'for (const [clientId, app] of latestMaintenanceByClient.entries()) {',
  'for (const [clientId, app] of Array.from(latestMaintenanceByClient.entries())) {'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
