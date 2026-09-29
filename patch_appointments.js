const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/appointments.ts', 'utf8');

code = code.replace(
  'client:clients(name, phone)',
  'client:clients(name, phone, notes)'
);

code = code.replace(
  'phone: row.client?.phone || "",',
  'phone: row.client?.phone || "",\n      clientNotes: row.client?.notes || "",'
);

fs.writeFileSync('src/lib/actions/appointments.ts', code);
