const fs = require('fs');

let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
code = code.replace(
  'paid: (a.paid || 0) + val',
  'paid: (a.paid || 0) + (pkgId ? 0 : val)'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
