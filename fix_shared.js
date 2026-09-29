const fs = require('fs');
let code = fs.readFileSync('src/components/shared.tsx', 'utf8');

code = code.replace(
  'export type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "online" | "reports";',
  'export type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "online" | "reports" | "settings";'
);

fs.writeFileSync('src/components/shared.tsx', code);
