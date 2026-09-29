const fs = require('fs');
let code = fs.readFileSync('src/lib/demo-data.ts', 'utf8');

code = code.replace(
  'phone?: string;',
  'phone?: string;\n  clientNotes?: string;'
);

fs.writeFileSync('src/lib/demo-data.ts', code);
