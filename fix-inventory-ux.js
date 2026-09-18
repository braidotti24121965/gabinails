const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Add isSaving to ProductModal
code = code.replace(
  'const [stock, setStock] = useState(product?.stock ?? ""); // Initial stock',
  'const [stock, setStock] = useState(product?.stock ?? ""); const [isSaving, setIsSaving] = useState(false);'
);

code = code.replace(
  '<button onClick={() => save({name, unit, minimum: Number(min), ideal: Number(ideal), cost: Number(cost), stock: Number(stock)})} className="btn-primary"><Check size={16} />Salvar produto</button>',
  '<button disabled={isSaving} onClick={async () => { setIsSaving(true); await save({name, unit, minimum: Number(min), ideal: Number(ideal), cost: Number(cost), stock: Number(stock)}); setIsSaving(false); }} className="btn-primary disabled:opacity-50"><Check size={16} />{isSaving ? "Salvando..." : "Salvar produto"}</button>'
);

// 2. Fix the save handler to not reload the page
code = code.replace(
  `            if (res.success) {
              window.location.reload();
            } else {`,
  `            if (res.success) {
              const fresh = await getInventory();
              setProductRows(fresh);
              setEntityModal(null);
            } else {`
);

// 3. Do the same for ServiceConsumablesModal just in case
code = code.replace(
  'const [adding, setAdding] = useState(false);',
  'const [adding, setAdding] = useState(false); const [isSaving, setIsSaving] = useState(false);'
);

code = code.replace(
  '<button onClick={() => save(items)} className="btn-primary"><Check size={16} />Salvar configuração</button>',
  '<button disabled={isSaving} onClick={async () => { setIsSaving(true); await save(items); setIsSaving(false); }} className="btn-primary disabled:opacity-50"><Check size={16} />{isSaving ? "Salvando..." : "Salvar configuração"}</button>'
);

code = code.replace(
  `            if (res.success) {
              window.location.reload();
            } else {
              alert("Erro ao salvar: " + (res as any).error);
            }`,
  `            if (res.success) {
              const freshServices = await getServices();
              setServiceRows(freshServices as any[]);
              setEntityModal(null);
            } else {
              alert("Erro ao salvar: " + (res as any).error);
            }`
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
