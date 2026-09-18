const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import { finishAppointment } from "@/lib/actions/attendance";',
  'import { finishAppointment } from "@/lib/actions/attendance";\nimport { createProduct } from "@/lib/actions/inventory";\nimport { updateServiceConsumables } from "@/lib/actions/services";'
);

// 2. Add service_consumables to EntityKind
code = code.replace(
  'type EntityKind = "client" | "service" | "professional" | "product" | "automation" | "appointment" | "financial";',
  'type EntityKind = "client" | "service" | "professional" | "product" | "automation" | "appointment" | "financial" | "service_consumables";'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
