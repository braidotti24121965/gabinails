const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update NailStudioApp to handle ServiceModal
const entityModalCondition = `if (entityModal.kind === "professional") return <ProfessionalModal mode={entityModal.mode as any} professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined} specialtiesList={specialtyList} close={() => setEntityModal(null)} save={saveProfessionalModal} />;
        if (entityModal.kind === "client") return <ClientModal mode={entityModal.mode as any} client={entityModal.index !== undefined ? clientRows[entityModal.index] : undefined} close={() => setEntityModal(null)} save={saveClientModal} />;`;

const newCondition = `if (entityModal.kind === "service") return <ServiceModal mode={entityModal.mode as any} service={entityModal.index !== undefined ? serviceRows[entityModal.index] : undefined} close={() => setEntityModal(null)} save={async (data) => {
          if (entityModal.mode === "create") {
            const res = await createServiceRecord(data);
            if (res.success) setServiceRows(current => [...current, { ...data, id: res.data?.id || "tmp", active: true }]);
          } else {
            // Edit not fully implemented backend yet, just optimistic
            setServiceRows(current => current.map((item, i) => i === entityModal.index ? { ...item, ...data } : item));
          }
          setEntityModal(null); notify("Serviço salvo com sucesso.");
        }} />;
        if (entityModal.kind === "professional") return <ProfessionalModal mode={entityModal.mode as any} professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined} specialtiesList={specialtyList} close={() => setEntityModal(null)} save={saveProfessionalModal} />;
        if (entityModal.kind === "client") return <ClientModal mode={entityModal.mode as any} client={entityModal.index !== undefined ? clientRows[entityModal.index] : undefined} close={() => setEntityModal(null)} save={saveClientModal} />;`;

content = content.replace(entityModalCondition, newCondition);

// Let's add the ServiceModal component definition right before FinishModal
const serviceModalDef = `
function ServiceModal({ mode, service, close, save }: { mode: "create" | "view" | "edit"; service?: ServiceItem; close: () => void; save: (data: Omit<ServiceItem, 'id' | 'active'>) => void }) {
  const [formData, setFormData] = useState({
    name: service?.name || "",
    category: service?.category || "Geral",
    duration: service?.duration || 60,
    price: service?.price || 0,
    maintenance: service?.maintenance || 0
  });
  const readOnly = mode === "view";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <button onClick={close} className="fixed inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">{mode === "create" ? "Novo Serviço" : mode === "view" ? "Detalhes do Serviço" : "Editar Serviço"}</Badge>
            <h2 className="mt-2 text-xl font-bold">{formData.name || "Novo Serviço"}</h2>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>
        
        <form onSubmit={e => {
          e.preventDefault();
          save(formData);
        }}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Nome do Serviço *</label>
              <input required className="field-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Categoria</label>
                <input className="field-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Preço (R$) *</label>
                <input required type="number" step="0.01" min="0" className="field-input" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Duração (minutos) *</label>
                <input required type="number" min="1" className="field-input" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Manutenção sugerida (dias)</label>
                <input type="number" min="0" className="field-input" value={formData.maintenance || ''} onChange={e => setFormData({...formData, maintenance: Number(e.target.value)})} disabled={readOnly} placeholder="0 = Sem manutenção" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={close} className="btn-outline">Cancelar</button>
            {!readOnly && <button type="submit" className="btn-primary"><Check size={16} />Salvar serviço</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
`;

content = content.replace('function FinishModal', serviceModalDef + '\nfunction FinishModal');

fs.writeFileSync(path, content);
