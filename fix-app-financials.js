const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update signature
content = content.replace(
  'initialServices?: any[] }) {',
  'initialServices?: any[]; initialFinancials?: any[]; initialStats?: any }) {'
);
content = content.replace(
  'initialServices = demoServices as any[] }',
  'initialServices = demoServices as any[], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 } }'
);

// 2. Update financialRows
content = content.replace(
  'const [financialRows, setFinancialRows] = useState(() => [...initialFinancialRows]);',
  'const [financialRows, setFinancialRows] = useState(() => initialFinancials.length > 0 ? [...initialFinancials] : [...initialFinancialRows]);'
);

// 3. Update Dashboard stats
// The Dashboard component is inline or a separate component?
// Let's find "31.840"
content = content.replace('money.format(31840)', 'money.format(initialStats?.revenue || 0)');
content = content.replace('money.format(21500)', 'money.format(initialStats?.balance || 0)');
content = content.replace('money.format(8400)', 'money.format(initialStats?.expenses || 0)');
content = content.replace('money.format(3100)', 'money.format(initialStats?.commissions || 0)');

fs.writeFileSync(path, content);
