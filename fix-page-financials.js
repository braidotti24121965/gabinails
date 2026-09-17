const fs = require('fs');
const path = 'src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { getFinancialData }')) {
  content = content.replace(
    'import { getServices } from "@/lib/actions/services";',
    'import { getServices } from "@/lib/actions/services";\nimport { getFinancialData } from "@/lib/actions/financials";'
  );
  
  content = content.replace(
    'const services = await getServices();',
    'const services = await getServices();\n  const financialData = await getFinancialData();'
  );
  
  content = content.replace(
    'initialServices={services}',
    'initialServices={services}\n    initialFinancials={financialData.transactions}\n    initialStats={financialData.stats}'
  );
  
  fs.writeFileSync(path, content);
}
