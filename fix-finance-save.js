const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

if (!code.includes('createExpense')) {
  code = code.replace(
    'import { createProduct',
    'import { createExpense } from "@/lib/actions/finance";\\nimport { createProduct'
  );
  
  code = code.replace(
    'if (kind === "financial") { const value = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0; setFinancialRows(current => creating ? [...current, { date: "Hoje", name, type: "Despesa", method: "PIX", status: "Pendente", value: -value }] : current.map((item, i) => i === index ? { ...item, name, value: item.value < 0 ? -value : value } : item)); }',
    `if (kind === "financial") {
      const value = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0;
      if (creating) {
        const res = await createExpense(name, value);
        if (res.success) window.location.reload();
      }
    }`
  );
  
  fs.writeFileSync('src/components/nail-studio-app.tsx', code);
}
