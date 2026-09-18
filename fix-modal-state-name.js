const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Replace my wrong code with the correct state variable
code = code.replace(
  '{modalState && modalState.kind === "service_consumables" && (',
  '{entityModal && entityModal.kind === "service_consumables" && ('
);
code = code.replace(
  'service={serviceRows[modalState.index!]}',
  'service={serviceRows[entityModal.index!]}'
);
code = code.replace(
  'const svc = serviceRows[modalState.index!];',
  'const svc = serviceRows[entityModal.index!];'
);
code = code.replace(
  'close={closeModal}',
  'close={() => setEntityModal(null)}'
);

// Also need to fix ProductModal usage!
code = code.replace(
  '{modalState && modalState.kind === "product" && modalState.mode === "create" && (',
  '{entityModal && entityModal.kind === "product" && entityModal.mode === "create" && ('
);
code = code.replace(
  '<ProductModal \n    close={closeModal}',
  '<ProductModal \n    close={() => setEntityModal(null)}'
);

// We need to hide EntityModal if it's product or service_consumables
code = code.replace(
  '<EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />',
  '{entityModal.kind !== "product" && entityModal.kind !== "service_consumables" && <EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />}'
);

// Also I didn't add "service_consumables" to EntityModalState type, let's fix it
code = code.replace(
  'export type EntityModalState = { kind: "client" | "service" | "professional" | "appointment" | "financial" | "product" | "automation" | "checkout";',
  'export type EntityModalState = { kind: "client" | "service" | "professional" | "appointment" | "financial" | "product" | "automation" | "checkout" | "service_consumables";'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
