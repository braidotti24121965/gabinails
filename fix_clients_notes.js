const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');

// In createClientRecord
code = code.replace(
  'notes: client.notes || null,',
  'notes: text || null,'
);

// Wait, I need to be careful with replace all
code = code.replace(
  'notes: client.notes || null,',
  'notes: text || null,'
);

fs.writeFileSync('src/lib/actions/clients.ts', code);
