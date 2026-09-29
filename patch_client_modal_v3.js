const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Add new state variables
const stateVars = `const [anamnesis, setAnamnesis] = useState(initialAnamnesis);
  const [packages, setPackages] = useState(initialPackages);`;
const newStateVars = `const [anamnesis, setAnamnesis] = useState(initialAnamnesis);
  const [packages, setPackages] = useState(initialPackages);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: "", total: 4, price: 120, method: "PIX" });
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState({ name: "", total: 0, used: 0 });`;

code = code.replace(stateVars, newStateVars);


// 2. Replace the entire tab === "pacotes" section
// I need to find where {tab === "pacotes" && ( starts and where it ends.
// To be safe, I'll use regex or string indexing.

const startIndex = code.indexOf('{tab === "pacotes" && (');
const endIndex = code.indexOf('{tab === "anamnese" && ('); // Wait, anamnese is BEFORE pacotes.
const formEndIndex = code.indexOf('<div className="mt-6 flex justify-end gap-3 border-t border-[#E7EDF3] pt-4">');

if (startIndex !== -1 && formEndIndex !== -1) {
  const oldSection = code.substring(startIndex, formEndIndex);
  
  const newSection = `{tab === "pacotes" && (
      <div className="space-y-4">
        {client?.id && !client.id.startsWith("demo-") ? (
          <>
            {!isAddingPackage && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-emerald-900">Vender Novo Pacote</h4>
                  <p className="text-xs text-emerald-700">O valor entrará no financeiro como receita hoje.</p>
                </div>
                <button type="button" onClick={() => setIsAddingPackage(true)} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1.5">
                  + Adicionar Pacote
                </button>
              </div>
            )}

            {isAddingPackage && (
              <div className="bg-white border-2 border-emerald-100 p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold mb-3 text-emerald-900">Detalhes do Novo Pacote</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="field-label">Nome do Pacote</label>
                    <input className="field-input" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} placeholder="Ex: Pacote Pé e Mão (4x)" />
                  </div>
                  <div>
                    <label className="field-label">Nº de Sessões</label>
                    <input type="number" className="field-input" value={newPkg.total} onChange={e => setNewPkg({...newPkg, total: +e.target.value})} />
                  </div>
                  <div>
                    <label className="field-label">Valor Total (R$)</label>
                    <input type="number" className="field-input" value={newPkg.price} onChange={e => setNewPkg({...newPkg, price: +e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">Forma de Pagamento</label>
                    <select className="field-input" value={newPkg.method} onChange={e => setNewPkg({...newPkg, method: e.target.value})}>
                      <option value="PIX">PIX</option>
                      <option value="Crédito">Cartão de Crédito</option>
                      <option value="Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button type="button" onClick={() => setIsAddingPackage(false)} className="btn-outline text-xs py-1.5">Cancelar</button>
                  <button type="button" onClick={async (e) => {
                    if (!newPkg.name) return alert("Digite o nome do pacote");
                    const btn = e.target; btn.disabled = true; const oldTxt = btn.innerText; btn.innerText = "Processando...";
                    
                    try {
                      // Save client first to ensure ID exists
                      await save({ name, phone, birthDate, cep, street, number, complement, neighborhood, city, state, notes: JSON.stringify({ text: notes, anamnesis, packages }), email });
                      
                      const { sellPackage } = await import("@/lib/actions/packages");
                      const res = await sellPackage(client.id, newPkg.name, newPkg.total, newPkg.price, newPkg.method);
                      
                      if (res.success) {
                        setPackages([...packages, { id: Date.now().toString(), name: newPkg.name, total: newPkg.total, used: 0, created_at: new Date().toISOString() }]);
                        setIsAddingPackage(false);
                        setNewPkg({ name: "", total: 4, price: 120, method: "PIX" });
                      } else {
                        alert("Erro ao salvar pacote no financeiro.");
                      }
                    } catch(e) { alert("Erro de conexão"); }
                    
                    btn.disabled = false; btn.innerText = oldTxt;
                  }} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1.5">
                    Confirmar e Receber
                  </button>
                </div>
              </div>
            )}
            
            <h4 className="font-semibold mt-6 mb-2">Pacotes Ativos</h4>
            {(!packages || packages.length === 0) ? (
              <p className="text-sm text-muted text-center py-6 border-2 border-dashed rounded-lg">Esta cliente ainda não possui pacotes.</p>
            ) : (
              <div className="space-y-3">
                {packages.map((p: any) => (
                  <div key={p.id} className="p-3 border rounded-lg">
                    {editingPkgId === p.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted">Nome do Pacote</label>
                          <input className="field-input !py-1 !text-sm" value={editPkg.name} onChange={e => setEditPkg({...editPkg, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted">Total de Sessões</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.total} onChange={e => setEditPkg({...editPkg, total: +e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted">Sessões Usadas</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.used} onChange={e => setEditPkg({...editPkg, used: +e.target.value})} />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                          <button type="button" onClick={() => setEditingPkgId(null)} className="text-xs text-muted hover:text-ink">Cancelar</button>
                          <button type="button" onClick={() => {
                            setPackages(packages.map((pkg: any) => pkg.id === p.id ? { ...pkg, name: editPkg.name, total: editPkg.total, used: editPkg.used } : pkg));
                            setEditingPkgId(null);
                          }} className="text-xs text-primary font-medium hover:underline">Salvar Edição</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted">Adicionado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => { setEditPkg({ name: p.name, total: p.total, used: p.used || 0 }); setEditingPkgId(p.id); }} className="text-xs text-primary hover:underline">Editar</button>
                            <button type="button" onClick={() => { if(confirm("Tem certeza que deseja apagar este pacote? O financeiro não será estornado automaticamente.")) setPackages(packages.filter((pkg: any) => pkg.id !== p.id)); }} className="text-xs text-danger hover:underline">Excluir</button>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge tone={p.used >= p.total ? "neutral" : "success"}>
                            {p.total - p.used} sessões restantes
                          </Badge>
                          <p className="text-xs text-muted mt-1">{p.used || 0} de {p.total} utilizadas</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted text-center py-6">Salve a cliente primeiro (botão Salvar abaixo) para gerenciar seus pacotes.</p>
        )}
      </div>
    )}
    
`;

  code = code.replace(oldSection, newSection);
  fs.writeFileSync('src/components/nail-studio-app.tsx', code);
}
