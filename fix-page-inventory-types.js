const fs = require('fs');
let appContent = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

appContent = appContent.replace(
  'initialFinancials?: any[]; initialStats?: any }) {',
  'initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any }) {'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', appContent);
