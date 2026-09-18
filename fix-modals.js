const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '{entityModal && (',
  `{viewingClient && <ClientDetailsModal client={viewingClient} close={() => setViewingClient(null)} />}\n      {closingCommissionFor && <ProfessionalCommissionsModal professional={closingCommissionFor} close={() => setClosingCommissionFor(null)} />}\n      {entityModal && (`
);

// Also need to check if the button "Comissões" works!
// Wait, I replaced \`<RowActions onView={() => onAction("view", index)}\` with the Comissoes button in a previous step, but let's see if it actually stuck.
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
