const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Dashboard component uses: <SmallMetricLink go={go} label="Faturamento mensal" value="R$ 31.840" target="finance" />
// And other stats. We need to pass stats to Dashboard!
content = content.replace(
  'function Dashboard({ go, onAttendance }: { go: (v: View) => void, onAttendance?: (a: Appointment) => void }) {',
  'function Dashboard({ go, stats, onAttendance }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void }) {'
);

content = content.replace(
  'value="R$ 31.840"',
  'value={stats ? money.format(stats.revenue) : "R$ 0,00"}'
);

content = content.replace(
  'if (view === "dashboard") return <Dashboard go={setView} onAttendance',
  'if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} onAttendance'
);

// Finance component uses hardcoded values
content = content.replace(
  'function Finance({ data, onNew, onAction, onReverse }: { data: typeof initialFinancialRows;',
  'function Finance({ data, stats, onNew, onAction, onReverse }: { data: any[]; stats?: any;'
);

content = content.replace(
  'if (view === "finance") return <Finance data={financialRows}',
  'if (view === "finance") return <Finance stats={initialStats} data={financialRows}'
);

// In Finance component:
content = content.replace(
  '<Metric label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="246 serviços realizados" icon={TrendingUp} />',
  '<Metric label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Mês atual" icon={TrendingUp} />'
);
content = content.replace(
  '<Metric label="Recebimentos" value="R$ 28.920"',
  '<Metric label="Recebimentos" value={stats ? money.format(stats.revenue) : "R$ 0,00"}'
);
content = content.replace(
  '<Metric label="Despesas" value="R$ 8.460"',
  '<Metric label="Despesas" value={stats ? money.format(stats.expenses) : "R$ 0,00"}'
);
content = content.replace(
  '<Metric label="Resultado estimado" value="R$ 12.840"',
  '<Metric label="Resultado estimado" value={stats ? money.format(stats.balance) : "R$ 0,00"}'
);
content = content.replace(
  '<p className="mt-1 text-xl font-semibold">R$ 10.540</p>',
  '<p className="mt-1 text-xl font-semibold">{stats ? money.format(stats.commissions) : "R$ 0,00"}</p>'
);
content = content.replace(
  '<p className="mt-1 text-xl font-semibold">R$ 2.920</p>',
  '<p className="mt-1 text-xl font-semibold">R$ 0,00</p>'
);

fs.writeFileSync(path, content);
