const fs = require('fs');

let code = fs.readFileSync('src/components/dashboard/finance.tsx', 'utf8');
code = code.replace(
  'onDelete={() => onReverse(index)}',
  'onDelete={() => handleReverse(item.id, index)}'
);

code = code.replace(
  '{data.length === 0 && (',
  '{financeData.length === 0 && ('
);

fs.writeFileSync('src/components/dashboard/finance.tsx', code);
