const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'appointment: "agendamento", financial: "lançamento" };',
  'appointment: "agendamento", financial: "lançamento", service_consumables: "consumo" };'
);

code = code.replace(
  'alert("Erro ao salvar: " + res.error);',
  'alert("Erro ao salvar: " + (res as any).error);'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
