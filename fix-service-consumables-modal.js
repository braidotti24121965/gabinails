const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Add import
if (!code.includes('updateServiceConsumables')) {
  code = code.replace(
    'import { getServices } from "@/lib/actions/services";',
    'import { getServices, updateServiceConsumables } from "@/lib/actions/services";'
  );
}

// Update Services render to pass onConsumables
code = code.replace(
  'function Services({ data, onNew, onAction, onDelete }: { data: any[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) {',
  'function Services({ data, onNew, onAction, onDelete, onConsumables }: { data: any[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void; onConsumables: (index: number) => void }) {'
);
code = code.replace(
  '<RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} />',
  '<RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} /><button onClick={() => onConsumables(index)} className="ml-2 text-xs text-primary hover:underline">Configurar Consumo</button>'
);

// Add ServiceConsumablesModal component
const modalCode = `
function ServiceConsumablesModal({ service, inventory, close, save }: { service: any; inventory: any[]; close: () => void; save: (consumables: any[]) => Promise<void> }) {
  const [items, setItems] = useState<any[]>(service.consumables || []);
  const [adding, setAdding] = useState(false);
  
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">Consumo Automático</Badge><h2 className="mt-2 text-xl font-bold">{service.name}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div>
  <p className="text-sm text-muted mb-4">Escolha os produtos que devem ser baixados automaticamente do estoque quando este serviço for concluído.</p>
  
  <div className="space-y-3 mb-4">
    {items.map((it, idx) => {
      const prod = inventory.find(p => p.id === it.product_id);
      return <div key={idx} className="flex justify-between items-center bg-bg p-3 rounded-md">
        <p className="font-medium text-sm">{prod?.product || 'Produto desconhecido'}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm">{it.estimated_quantity} {prod?.unit || 'un'}</span>
          <button onClick={() => setItems(curr => curr.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={15}/></button>
        </div>
      </div>
    })}
    {items.length === 0 && <p className="text-xs text-muted">Nenhum produto vinculado a este serviço.</p>}
  </div>

  {adding ? (
    <div className="flex gap-2 mb-4 bg-bg p-3 rounded-md border border-[#E7EDF3]">
      <select id="prod-select" className="field-input flex-1 !h-9 !py-1 text-sm"><option value="">Selecione o produto</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.product}</option>)}</select>
      <input id="prod-qtd" type="number" step="0.1" placeholder="Qtd" className="field-input w-20 !h-9 !py-1 text-sm" />
      <button onClick={() => {
        const p = document.getElementById("prod-select") as HTMLSelectElement;
        const q = document.getElementById("prod-qtd") as HTMLInputElement;
        if(p.value && q.value) {
          setItems(curr => [...curr, { product_id: p.value, estimated_quantity: Number(q.value) }]);
          setAdding(false);
        }
      }} className="btn-primary !h-9 !px-3"><Check size={16}/></button>
      <button onClick={() => setAdding(false)} className="btn-outline !h-9 !px-3"><X size={16}/></button>
    </div>
  ) : (
    <button onClick={() => setAdding(true)} className="btn-ghost mb-4"><Plus size={15}/> Adicionar produto</button>
  )}

  <div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button><button onClick={() => save(items)} className="btn-primary"><Check size={16} />Salvar configuração</button></div></div></div>;
}
`;

code = code.replace('function ProductModal', modalCode + '\nfunction ProductModal');

// Render ServiceConsumablesModal conditionally
const renderConsumablesModal = `
{modalState && modalState.kind === "service_consumables" && (
  <ServiceConsumablesModal 
    service={serviceRows[modalState.index!]}
    inventory={productRows}
    close={closeModal} 
    save={async (items) => {
      const svc = serviceRows[modalState.index!];
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

code = code.replace('{modalState && modalState.kind === "product" && modalState.mode === "create"', renderConsumablesModal + '\n{modalState && modalState.kind === "product" && modalState.mode === "create"');

// Update view === "services" to pass onConsumables
code = code.replace(
  'if (view === "services") return <Services data={serviceRows} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço da demonstração?", () => { setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço removido."); })} />;',
  'if (view === "services") return <Services data={serviceRows} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço da demonstração?", () => { setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço removido."); })} onConsumables={(index) => openEntity("service_consumables" as any, "edit", index)} />;'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
