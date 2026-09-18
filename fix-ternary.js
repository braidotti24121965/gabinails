const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '{entityModal.kind !== "product" && entityModal.kind !== "service_consumables" && <EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />}',
  '(entityModal.kind !== "product" && entityModal.kind !== "service_consumables" ? <EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} /> : null)'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
