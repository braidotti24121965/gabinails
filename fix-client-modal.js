const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

if (!code.includes('ClientDetailsModal')) {
  // Imports
  code = code.replace(
    'import { getProfessionalCommissions, payCommissions } from "@/lib/actions/commissions";',
    'import { getProfessionalCommissions, payCommissions } from "@/lib/actions/commissions";\nimport { getClientDetails, uploadClientPhoto } from "@/lib/actions/clients";'
  );

  const modalCode = `
function ClientDetailsModal({ client, close }: { client: any; close: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client?.id) {
      getClientDetails(client.id).then(res => {
        setData(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [client]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client?.id) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadClientPhoto(client.id, base64, 'other');
      if (res.success) {
        // Refresh data
        const fresh = await getClientDetails(client.id);
        setData(fresh);
      } else {
        alert("Erro ao salvar foto: " + res.error);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button onClick={close} className="absolute inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-4xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 max-h-[90vh] flex flex-col">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">Ficha da Cliente</Badge>
            <h2 className="mt-2 text-2xl font-bold">{client.name}</h2>
            <p className="text-muted">{client.phone}</p>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>
        
        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : !data ? (
          <div className="py-12 text-center text-muted">Cliente não encontrada no banco de dados.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Visitas totais" value={data.stats.visits.toString()} icon={Calendar} />
              <Metric label="Total investido" value={money.format(data.stats.spent)} icon={CircleDollarSign} />
              <Metric label="Cliente desde" value={data.stats.memberSince} icon={Check} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Histórico */}
              <section className="card p-5">
                <SectionTitle title="Histórico de Agendamentos" />
                <div className="space-y-4 mt-4">
                  {data.history.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum agendamento registrado.</p>
                  ) : (
                    data.history.map((h: any) => (
                      <div key={h.id} className="flex justify-between items-center border-b border-[#E7EDF3] pb-3 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{h.date} às {h.time}</p>
                          <p className="text-xs text-muted mt-0.5">{h.services} com {h.professional}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone={h.status === 'Concluído' ? 'success' : h.status === 'Cancelado' ? 'danger' : 'warning'}>{h.status}</Badge>
                          <p className="text-xs font-semibold mt-1 text-navy-dark">{money.format(h.paid)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Fotos e Galeria */}
              <section className="card p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <SectionTitle title="Galeria Antes & Depois" />
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary text-xs py-1.5 px-3">
                    <Plus size={14} /> {uploading ? "Enviando..." : "Adicionar foto"}
                  </button>
                </div>
                
                {data.photos.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#E7EDF3] rounded-lg p-6 bg-bg/50">
                    <p className="text-sm text-muted text-center">Nenhuma foto registrada para esta cliente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.photos.map((p: any) => (
                      <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-[#E7EDF3] group">
                        <img src={p.storage_path} alt="Unhas" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 p-1 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
`;

  code = code.replace(
    'function ProfessionalCommissionsModal',
    modalCode + '\nfunction ProfessionalCommissionsModal'
  );

  // Add state for client details
  code = code.replace(
    'const [closingCommissionFor, setClosingCommissionFor] = useState<any>(null);',
    'const [closingCommissionFor, setClosingCommissionFor] = useState<any>(null);\n  const [viewingClient, setViewingClient] = useState<any>(null);'
  );

  // Render client details modal
  code = code.replace(
    '{closingCommissionFor',
    '{viewingClient && <ClientDetailsModal client={viewingClient} close={() => setViewingClient(null)} />}\n      {closingCommissionFor'
  );

  // Hook into client "view" action
  // Currently client uses EntityModal via onAction("view", index)
  // Let's modify the Clients component to pass "view" directly to our state OR intercept in onAction
  code = code.replace(
    '<Clients data={clientRows} onNew={() => openEntity("client", "create")} onAction={(mode, index) => openEntity("client", mode, index)}',
    '<Clients data={clientRows} onNew={() => openEntity("client", "create")} onAction={(mode, index) => { if (mode === "view") { setViewingClient(clientRows[index]); } else { openEntity("client", mode, index); } }}'
  );

  fs.writeFileSync('src/components/nail-studio-app.tsx', code);
}
