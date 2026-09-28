const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/finance.tsx', 'utf8');
code = code.replace(
  'subtitle="De onde vem o Lucro Líquido?" icon={<PieChart size={18} className="text-primary" />}',
  'subtitle="De onde vem o Lucro Líquido?"'
);
fs.writeFileSync('src/components/dashboard/finance.tsx', code);
