const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/automations.ts', 'utf8');

code = code.replace(
  '.eq("status", "scheduled")\n    .gte("starts_at", tomorrowStr + "T00:00:00.000Z")\n    .lte("starts_at", tomorrowStr + "T23:59:59.999Z");',
  `.eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);`
);

code = code.replace(
  'Passando para lembrar do nosso horário agendado amanhã (${date}) às ${time}',
  'Passando para lembrar do nosso horário agendado para o dia ${date} às ${time}'
);

fs.writeFileSync('src/lib/actions/automations.ts', code);
