const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');

// 1. replace select query
code = code.replace(
  '      appointments (\n        status,\n        payments (\n          amount\n        )\n      )',
  '      appointments (\n        status,\n        starts_at,\n        payments (\n          amount\n        )\n      )'
);

// 2. replace last and next mapping
// I already replaced it in the first run! Let's check if the first run replaced the last/next part correctly
fs.writeFileSync('src/lib/actions/clients.ts', code);
