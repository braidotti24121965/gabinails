const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

if (!code.includes('ProfessionalCommissionsModal')) {
  // Add imports
  code = code.replace(
    'import { createExpense } from "@/lib/actions/finance";',
    'import { createExpense } from "@/lib/actions/finance";\\nimport { getProfessionalCommissions, payCommissions } from "@/lib/actions/commissions";'
  );
  
  // Add ProfessionalCommissionsModal component
  const modalCode = `
function ProfessionalCommissionsModal({ professional, close }: { professional: any; close: () => void }) {
  const [data, setData] = useState<{ commissions: any[], stats: { pending: number, paid: number } }>({ commissions: [], stats: { pending: 0, paid: 0 } });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (professional?.id) {
      getProfessionalCommissions(professional.id).then(res => {
        setData(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [professional]);

  const handlePay = async () => {
    if (!professional?.id) return;
    const pendingIds = data.commissions.filter(c => c.status === 'generated').map(c => c.id);
    if (pendingIds.length === 0) return;
    
    setPaying(true);
    const res = await payCommissions(professional.id, pendingIds, data.stats.pending);
    setPaying(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Erro ao pagar comissões: " + res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button onClick={close} className="absolute inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 max-h-[90vh] flex flex-col">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">Acerto de Comissões</Badge>
            <h2 className="mt-2 text-xl font-bold">{professional.name}</h2>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>
        
        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm text-amber-800">Saldo Pendente</p>
                <p className="text-2xl font-bold text-amber-900">{money.format(data.stats.pending)}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm text-green-800">Total já pago</p>
                <p className="text-2xl font-bold text-green-900">{money.format(data.stats.paid)}</p>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 border rounded-lg border-[#E7EDF3]">
              <table className="data-table">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th>Data</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted">Nenhuma comissão registrada.</td></tr>
                  ) : data.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.date}</td>
                      <td>{c.service}</td>
                      <td><Badge tone={c.status === 'paid' ? 'success' : 'warning'}>{c.status === 'paid' ? 'Pago' : 'Pendente'}</Badge></td>
                      <td className="font-medium text-right">{money.format(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E7EDF3]">
          <button onClick={close} className="btn-outline">Fechar</button>
          <button 
            onClick={handlePay} 
            disabled={paying || data.stats.pending <= 0 || loading} 
            className="btn-primary disabled:opacity-50"
          >
            <Check size={16} />{paying ? "Processando..." : "Fechar e Pagar Pendentes"}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

  code = code.replace(
    'function EntityModal({ state',
    modalCode + '\\nfunction EntityModal({ state'
  );

  // Add state for closing commissions
  code = code.replace(
    'const [entityModal, setEntityModal] = useState<EntityModalState | null>(null);',
    'const [entityModal, setEntityModal] = useState<EntityModalState | null>(null);\\n  const [closingCommissionFor, setClosingCommissionFor] = useState<any>(null);'
  );

  // Render the modal
  code = code.replace(
    '{entityModal && <EntityModal',
    '{closingCommissionFor && <ProfessionalCommissionsModal professional={closingCommissionFor} close={() => setClosingCommissionFor(null)} />}\\n      {entityModal && <EntityModal'
  );

  // Change action button in Professionals view
  code = code.replace(
    '<RowActions onView={() => onAction("view", index)}',
    '<button onClick={() => onAction("view", index)} className="text-sm font-medium text-primary hover:underline">Comissões</button>\\n<RowActions onView={() => onAction("edit", index)}'
  );

  fs.writeFileSync('src/components/nail-studio-app.tsx', code);
}
