const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove fallback for financialRows
content = content.replace(
  'const [financialRows, setFinancialRows] = useState(() => initialFinancials.length > 0 ? [...initialFinancials] : [...initialFinancialRows]);',
  'const [financialRows, setFinancialRows] = useState(() => [...initialFinancials]);'
);

// 2. Remove fallback for appointments
// In NailStudioApp props it says `initialAppointments = demoAppointments`
content = content.replace(
  'initialAppointments = demoAppointments,',
  'initialAppointments = [],'
);

// 3. Fix hardcoded stats in the <Financial /> component if it exists
const financialBlock = `function Financial({ data`;
if (content.includes(financialBlock)) {
  content = content.replace(
    'money.format(31840)',
    '{stats ? money.format(stats.revenue) : "R$ 0,00"}'
  );
  content = content.replace(
    'money.format(28920)',
    '{stats ? money.format(stats.revenue) : "R$ 0,00"}'
  );
  content = content.replace(
    'money.format(8460)',
    '{stats ? money.format(stats.expenses) : "R$ 0,00"}'
  );
  content = content.replace(
    'money.format(12840)',
    '{stats ? money.format(stats.balance) : "R$ 0,00"}'
  );
  content = content.replace(
    'money.format(10540)',
    '{stats ? money.format(stats.commissions) : "R$ 0,00"}'
  );
  content = content.replace(
    'money.format(2920)',
    '"R$ 0,00"'
  );
  
  // We need to pass stats to Financial
  content = content.replace(
    'function Financial({ data, onNew, onAction, onDelete }:',
    'function Financial({ data, stats, onNew, onAction, onDelete }:'
  );
  
  content = content.replace(
    'if (view === "financial") return <Financial data={financialRows}',
    'if (view === "financial") return <Financial stats={initialStats} data={financialRows}'
  );
}

fs.writeFileSync(path, content);
