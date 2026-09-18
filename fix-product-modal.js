const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Add import
if (!code.includes('createProduct')) {
  code = code.replace(
    'import { getInventory } from "@/lib/actions/inventory";',
    'import { getInventory } from "@/lib/actions/inventory";\nimport { createProduct, addStockMovement } from "@/lib/actions/inventory";'
  );
}

// Add ProductModal component
const productModalCode = `
function ProductModal({ close, save }: { close: () => void; save: (data: any) => Promise<void> }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [min, setMin] = useState("");
  const [ideal, setIdeal] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState(""); // Initial stock

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">Novo Produto</Badge><h2 className="mt-2 text-xl font-bold">Cadastrar Produto</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4">
    <div><label className="field-label">Nome do produto</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Esmalte Risqué Vermelho" /></div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="field-label">Unidade</label><select className="field-input" value={unit} onChange={e => setUnit(e.target.value)}>
        <option value="unit">Unidade</option><option value="ml">Mililitros (ml)</option><option value="g">Gramas (g)</option><option value="pair">Par</option>
      </select></div>
      <div><label className="field-label">Custo unitário (R$)</label><input className="field-input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="field-label">Estoque mínimo</label><input className="field-input" type="number" value={min} onChange={e => setMin(e.target.value)} /></div>
      <div><label className="field-label">Estoque ideal</label><input className="field-input" type="number" value={ideal} onChange={e => setIdeal(e.target.value)} /></div>
    </div>
    <div><label className="field-label">Saldo inicial (quantidade atual)</label><input className="field-input" type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
  </div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button><button onClick={() => save({name, unit, minimum: Number(min), ideal: Number(ideal), cost: Number(cost), stock: Number(stock)})} className="btn-primary"><Check size={16} />Salvar produto</button></div></div></div>;
}
`;

code = code.replace('function EntityModal', productModalCode + '\nfunction EntityModal');

// Render ProductModal conditionally in NailStudioApp
const renderModal = `{modalState && modalState.kind !== "appointment" && modalState.kind !== "checkout" && modalState.kind !== "product" && <EntityModal`;
code = code.replace(`{modalState && modalState.kind !== "appointment" && modalState.kind !== "checkout" && <EntityModal`, renderModal);

const renderProductModal = `
{modalState && modalState.kind === "product" && modalState.mode === "create" && (
  <ProductModal 
    close={closeModal} 
    save={async (data) => {
      // Create product
      const res = await createProduct(data);
      if (res.success) {
        // We need to reload to get the new product id, or we can just fetch it again
        // For MVP, just reload
        window.location.reload();
      } else {
        alert("Erro ao criar produto: " + res.error);
      }
    }} 
  />
)}
`;

code = code.replace('{modalState && modalState.kind === "checkout"', renderProductModal + '\n{modalState && modalState.kind === "checkout"');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
