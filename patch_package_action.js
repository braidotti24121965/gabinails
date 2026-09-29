const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/packages.ts', 'utf8');

code = code.replace(
  'total: totalSessions,\n    used: 0,',
  'total: totalSessions,\n    price: price,\n    used: 0,'
);

fs.writeFileSync('src/lib/actions/packages.ts', code);
