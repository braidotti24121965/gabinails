const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'import { createProduct, updateProduct, addStockMovement } from "@/lib/actions/inventory";',
  'import { createProduct, updateProduct, addStockMovement, getInventory } from "@/lib/actions/inventory";'
);

code = code.replace(
  'import { updateServiceConsumables } from "@/lib/actions/services";',
  'import { updateServiceConsumables, getServices } from "@/lib/actions/services";'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
