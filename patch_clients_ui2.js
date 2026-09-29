const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');
code = code.replace(
  'client_deposit_whitelist (\n        client_id,\n        removed_at\n      )',
  'client_deposit_whitelist (\n        client_id,\n        removed_at\n      ),\n      packages (\n        status,\n        remaining_sessions\n      )'
);
fs.writeFileSync('src/lib/actions/clients.ts', code);
