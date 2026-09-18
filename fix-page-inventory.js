const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Add import
if (!content.includes('getInventory')) {
  content = content.replace(
    'import { getFinancialData } from "@/lib/actions/financials";',
    'import { getFinancialData } from "@/lib/actions/financials";\nimport { getInventory } from "@/lib/actions/inventory";'
  );
}

// Add fetch
content = content.replace(
  'const financialData = await getFinancialData();',
  'const financialData = await getFinancialData();\n  const inventory = await getInventory();'
);

// Add to props
content = content.replace(
  'initialStats={financialData.stats}',
  'initialStats={financialData.stats}\n    initialInventory={inventory}'
);

fs.writeFileSync('src/app/page.tsx', content);

// Update NailStudioApp props to receive initialInventory
let appContent = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// replace demo data for inventory
appContent = appContent.replace(
  'initialAppointments = [],',
  'initialAppointments = [], initialInventory = [],'
);

appContent = appContent.replace(
  'initialStats }: {',
  'initialStats, initialInventory }: {'
);

appContent = appContent.replace(
  'const [productRows, setProductRows] = useState(inventory);',
  'const [productRows, setProductRows] = useState<any[]>(initialInventory);'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', appContent);
