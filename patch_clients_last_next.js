const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');

// I need to add starts_at to the select query in getClients
code = code.replace(
  '      appointments (\\n        status,\\n        payments (\\n          amount\\n        )\\n      )',
  '      appointments (\n        status,\n        starts_at,\n        payments (\n          amount\n        )\n      )'
);

// Then modify the mapping for last and next
const regex = /last: "Recente",\n\s*next: "—",/;
const replace = `last: (() => {
        const past = item.appointments?.filter(a => a.status === 'completed' && new Date(a.starts_at) <= new Date()).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0];
        if (!past) return "—";
        const diff = Math.floor((new Date().getTime() - new Date(past.starts_at).getTime()) / (1000 * 3600 * 24));
        if (diff === 0) return "Hoje";
        if (diff === 1) return "Ontem";
        return new Date(past.starts_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
      })(),
      next: (() => {
        const future = item.appointments?.filter(a => ['pending', 'scheduled', 'confirmed', 'awaiting_deposit'].includes(a.status) && new Date(a.starts_at) >= new Date()).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
        if (!future) return "—";
        const diff = Math.floor((new Date(future.starts_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (diff === 0) return "Hoje";
        if (diff === 1) return "Amanhã";
        return new Date(future.starts_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
      })(),`;

code = code.replace(regex, replace);

fs.writeFileSync('src/lib/actions/clients.ts', code);
