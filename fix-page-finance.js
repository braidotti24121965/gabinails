const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(
  'import { getFinancialData } from "@/lib/actions/financials";',
  'import { getFinance } from "@/lib/actions/finance";'
);

code = code.replace(
  'const financialData = await getFinancialData();',
  'const financialData = await getFinance();'
);

code = code.replace(
  'initialFinancials={financialData.transactions}',
  'initialFinancials={financialData.data}'
);

fs.writeFileSync('src/app/page.tsx', code);
