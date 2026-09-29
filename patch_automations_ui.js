const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/automations.tsx', 'utf8');

code = code.replace(
  'await markMessageSent(clientId);',
  'await markMessageSent(clientId, list);'
);

fs.writeFileSync('src/components/dashboard/automations.tsx', code);

// Fix tenantContext in NailStudioApp
let appCode = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
appCode = appCode.replace(
  'if (view === "automations") return <Automations go={setView} />;',
  'if (view === "automations") return <Automations go={setView} tenant={tenant} />;'
);
fs.writeFileSync('src/components/nail-studio-app.tsx', appCode);

// Fix Automations props
let autoCode = fs.readFileSync('src/components/dashboard/automations.tsx', 'utf8');
autoCode = autoCode.replace(
  'export function Automations({ go }: { go: (v: View) => void }) {',
  'export function Automations({ go, tenant }: { go: (v: View) => void; tenant?: any }) {'
);
fs.writeFileSync('src/components/dashboard/automations.tsx', autoCode);
