const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Faturamento mensal
content = content.replace(
  '<Metric label="Faturamento mensal" value="R$ 31.840" detail="246 serviços realizados"',
  '<Metric label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Mês atual"'
);

// Fix Recebimentos detail
content = content.replace(
  'detail="90,8% do faturado"',
  'detail="Soma de pagamentos"'
);

// Fix Despesas detail
content = content.replace(
  'detail="R$ 1.280 a vencer"',
  'detail="Contas do mês"'
);

// Fix 8 cobranças
content = content.replace(
  '8 cobranças',
  '0 cobranças'
);

// Fix 71% and +4,2%
content = content.replace(
  '<p className="mt-1 text-xl font-semibold">71%</p><Badge tone="success">+4,2% no mês</Badge>',
  '<p className="mt-1 text-xl font-semibold">--%</p><Badge tone="neutral">Mês atual</Badge>'
);

fs.writeFileSync(path, content);
