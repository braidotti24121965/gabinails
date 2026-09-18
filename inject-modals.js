const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const modals = `
      {entityModal && entityModal.kind === "product" && entityModal.mode === "create" && (
        <ProductModal 
          close={() => setEntityModal(null)} 
          save={async (data) => {
            const res = await createProduct(data);
            if (res.success) {
              window.location.reload();
            } else {
              alert("Erro ao criar produto: " + res.error);
            }
          }} 
        />
      )}
      {entityModal && entityModal.kind === "service_consumables" && (
        <ServiceConsumablesModal 
          service={serviceRows[entityModal.index!]}
          inventory={productRows}
          close={() => setEntityModal(null)} 
          save={async (items) => {
            const svc = serviceRows[entityModal.index!];
            const res = await updateServiceConsumables(svc.id, items.map(i => ({ product_id: i.product_id, quantity: i.estimated_quantity })));
            if (res.success) {
              window.location.reload();
            } else {
              alert("Erro ao salvar: " + res.error);
            }
          }} 
        />
      )}
`;

code = code.replace('{booking && <BookingModal', modals + '\n      {booking && <BookingModal');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
