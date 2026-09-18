const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'getClientDetails(client.id).then(res => {',
  `getClientDetails(client.id).then(res => {
        if (!res) { setData(null); setLoading(false); return; }`
);

code = code.replace(
  '<Metric label="Visitas totais" value={data.stats.visits.toString()} detail="Soma de atendimentos concluídos" icon={Calendar} />',
  '<Metric label="Visitas totais" value={(data?.stats?.visits || 0).toString()} detail="Soma de atendimentos concluídos" icon={Calendar} />'
);

code = code.replace(
  '<Metric label="Total investido" value={money.format(data.stats.spent)} detail="Soma de recebimentos da cliente" icon={CircleDollarSign} />',
  '<Metric label="Total investido" value={money.format(data?.stats?.spent || 0)} detail="Soma de recebimentos da cliente" icon={CircleDollarSign} />'
);

code = code.replace(
  '<Metric label="Cliente desde" value={data.stats.memberSince} detail="Data do cadastro" icon={Check} />',
  '<Metric label="Cliente desde" value={data?.stats?.memberSince || "-"} detail="Data do cadastro" icon={Check} />'
);

code = code.replace(
  'data.history.map',
  '(data.history || []).map'
);

code = code.replace(
  'data.photos.length === 0',
  '!data.photos || data.photos.length === 0'
);

code = code.replace(
  'data.photos.map',
  '(data.photos || []).map'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
