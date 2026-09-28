const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/reports.ts', 'utf8');

code = code.replace(
  '(ac as any).client_name = match.clients?.name || "Desconhecido";',
  'const c = match.clients as any;\n          (ac as any).client_name = (Array.isArray(c) ? c[0]?.name : c?.name) || "Desconhecido";'
);

fs.writeFileSync('src/lib/actions/reports.ts', code);
