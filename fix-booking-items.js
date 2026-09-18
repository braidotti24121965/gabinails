const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'status: "Aguardando sinal",\n      price: totalPrice,\n      source: "Interno"',
  'status: "Aguardando sinal",\n      price: totalPrice,\n      source: "Interno",\n      items: selectedSvcs.map((s: any) => ({ id: "temp-" + Date.now() + Math.random(), name: s.name, price: s.price }))'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
