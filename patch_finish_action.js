const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

code = code.replace(
  'paymentMethod: string;',
  'paymentMethod: string;\n  packageId?: string;'
);

code = code.replace(
  'amount,\n    method: paymentMethod,',
  'amount: paymentMethod === "Pacote" ? 0 : amount,\n    method: paymentMethod,'
);

fs.writeFileSync('src/lib/actions/attendance.ts', code);
