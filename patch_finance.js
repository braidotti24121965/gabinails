const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/finance.ts', 'utf8');

// Insert the promise for stock_movements
code = code.replace(
  "supabase.from('commissions').select('id, amount, status, created_at, professional:professionals(name)').order('created_at', { ascending: false })",
  "supabase.from('commissions').select('id, amount, status, created_at, professional:professionals(name)').order('created_at', { ascending: false }),\n    supabase.from('stock_movements').select('quantity, products(unit_cost)').eq('movement_type', 'consumption')"
);

// Destructure the 4th promise
code = code.replace(
  "    { data: commissions }",
  "    { data: commissions },\n    { data: consumptions }"
);

// Calculate consumption cost
code = code.replace(
  "let commTotal = 0;",
  "let commTotal = 0;\n  let consumptionCost = 0;\n\n  if (consumptions) {\n    consumptions.forEach((c: any) => {\n      const qty = Number(c.quantity || 0);\n      const cost = Number(c.products?.unit_cost || 0);\n      consumptionCost += (qty * cost);\n    });\n  }"
);

// Update balance
code = code.replace(
  "balance: revenue - expensesTotal - commTotal",
  "balance: revenue - expensesTotal - commTotal - consumptionCost,\n      consumptionCost"
);

fs.writeFileSync('src/lib/actions/finance.ts', code);
