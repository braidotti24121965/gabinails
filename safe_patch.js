const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. ClientModal packages tab logic (replace the block)
const startIndex = code.indexOf('{tab === "pacotes" && (');
let braceCount = 0;
let endIndex = -1;
for (let i = startIndex; i < code.length; i++) {
  if (code[i] === '{') braceCount++;
  if (code[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }
}
const oldPackagesTab = code.substring(startIndex, endIndex + 1);
const newPackagesTab = `{tab === "pacotes" && (
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
              <div className="border border-emerald-200 bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-emerald-900 mb-3 text-sm">Dados do Novo Pacote</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="field-label">Nome ou Serviço</label>
                    <input className="field-input" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} placeholder="Ex: 4 Manicures" />
                  </div>
                  <div>
                    <label className="field-label">Qtd. Sessões</label>
                    <input type="number" className="field-input" value={newPkg.total} onChange={e => setNewPkg({...newPkg, total: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="field-label">Valor Cobrado (R$)</label>
                    <input type="number" className="field-input" value={newPkg.price} onChange={e => setNewPkg({...newPkg, price: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="field-label">Pagamento</label>
                    <select className="field-input" value={newPkg.method} onChange={e => setNewPkg({...newPkg, method: e.target.value})}>
                      <option value="PIX">PIX</option><option value="Crédito">Crédito</option><option value="Débito">Débito</option><option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                  <button type="button" onClick={() => setIsAddingPackage(false)} className="px-3 py-1.5 text-sm text-muted hover:text-ink">Cancelar</button>
                  <button type="button" onClick={async (e) => {
                    if (!newPkg.name) return alert("Digite o nome do pacote");
                    const btn = e.target; btn.disabled = true; btn.innerText = "Processando...";
                    try {
                      await save({ name, phone, birthDate, cep, street, number, complement, neighborhood, city, state, notes: JSON.stringify({ text: notes, anamnesis }), email });
                      const { sellPackage, getActivePackages } = await import("@/lib/actions/packages");
                      const res = await sellPackage(client.id, newPkg.name, newPkg.total, newPkg.price, newPkg.method);
                      if (res.success) {
                        const pkgs = await getActivePackages(client.id);
                        setPackages(pkgs);
                        setIsAddingPackage(false);
                        setNewPkg({ name: "", total: 4, price: 120, method: "PIX" });
                      } else {
                        alert("Erro ao vender pacote: " + res.error);
                      }
                    } catch(err) { alert("Erro: " + err.message); }
                    btn.disabled = false; btn.innerText = "Confirmar Venda";
                  }} className="btn-primary bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-sm py-1.5">Confirmar Venda</button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-3">Pacotes Ativos</h3>
              {packages.length === 0 ? (
                <p className="text-sm text-muted bg-bg p-4 rounded-md text-center">Nenhum pacote ativo no momento.</p>
              ) : (
                <div className="grid gap-3">
                  {packages.map((p: any) => (
                    <div key={p.id} className="border border-[#E7EDF3] p-4 rounded-lg bg-white relative">
                      <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                        {p.remaining_sessions} / {p.total_sessions} restantes
                      </div>
                      
                      {editingPkgId === p.id ? (
                        <div className="space-y-3 pt-2">
                          <input className="field-input text-sm font-semibold" value={editPkg.name} onChange={e => setEditPkg({...editPkg, name: e.target.value})} />
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className="text-xs text-muted block mb-1">Total de Sessões</span><input type="number" className="field-input" value={editPkg.total} onChange={e => setEditPkg({...editPkg, total: Number(e.target.value)})} /></label>
                            <label><span className="text-xs text-muted block mb-1">Sessões Restantes</span><input type="number" className="field-input" value={editPkg.used} onChange={e => setEditPkg({...editPkg, used: Number(e.target.value)})} /></label>
                          </div>
                          <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={() => setEditingPkgId(null)} className="text-xs text-muted hover:text-ink">Cancelar</button>
                            <button type="button" onClick={async () => {
                              const { updatePackage, getActivePackages } = await import("@/lib/actions/packages");
                              await updatePackage(p.id, editPkg.name, editPkg.total, editPkg.used);
                              const pkgs = await getActivePackages(client.id);
                              setPackages(pkgs);
                              setEditingPkgId(null);
                            }} className="text-xs text-primary font-medium hover:underline">Salvar Edição</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-medium">{p.name}</h4>
                          <p className="text-xs text-muted mt-1">Vendido por {money.format(p.price)}</p>
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => { setEditPkg({ name: p.name, total: p.total_sessions, used: p.remaining_sessions, price: p.price }); setEditingPkgId(p.id); }} className="text-xs text-primary hover:underline">Editar</button>
                            <button type="button" onClick={async () => { 
                              if(confirm("Tem certeza que deseja apagar este pacote? O financeiro não será estornado automaticamente.")) {
                                const { deletePackage, getActivePackages } = await import("@/lib/actions/packages");
                                await deletePackage(p.id);
                                const pkgs = await getActivePackages(client.id);
                                setPackages(pkgs);
                              }
                            }} className="text-xs text-danger hover:underline">Excluir</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm border border-amber-200">
            Você precisa salvar este cliente pela primeira vez antes de vender pacotes.
          </div>
        )}
      </div>
    )}`;
code = code.replace(oldPackagesTab, newPackagesTab);

// 2. ClientModal Logic (useEffect)
const oldEffect = /let initialNotes = client\?.notes \|\| "";\n.*?catch\(e\) \{\}/s;
const newEffect = `let initialNotes = client?.notes || "";
  let initialAnamnesis = { diabetes: false, gestante: false, roeUnha: false, alergias: "" };
  let initialPackages: any[] = [];
  
  try {
    if (initialNotes.startsWith("{")) {
      const parsed = JSON.parse(initialNotes);
      if (parsed.text !== undefined) initialNotes = parsed.text;
      if (parsed.anamnesis) initialAnamnesis = { ...initialAnamnesis, ...parsed.anamnesis };
    }
  } catch(e) {}
  
  const [notes, setNotes] = useState(initialNotes);
  const [anamnesis, setAnamnesis] = useState(initialAnamnesis);
  const [packages, setPackages] = useState(initialPackages);
  
  useEffect(() => {
    if (client?.id && !client.id.startsWith("demo-")) {
      import("@/lib/actions/packages").then(m => {
        m.getActivePackages(client.id).then(pkgs => setPackages(pkgs));
      });
      import("@/lib/actions/clients").then(m => {
        m.getClientAnamnesis(client.id).then(ana => {
          if (ana) setAnamnesis({ diabetes: ana.diabetes, gestante: ana.pregnant, roeUnha: ana.nail_biting, alergias: ana.allergies });
        });
      });
    }
  }, [client?.id]);`;
code = code.replace(oldEffect, newEffect);

code = code.replace(
  'const finalNotes = JSON.stringify({ text: notes, anamnesis, packages });',
  'const finalNotes = JSON.stringify({ text: notes, anamnesis });'
);

// 3. Automations prop
code = code.replace(
  '<Automations go={setCurrentView} />',
  '<Automations go={setCurrentView} tenant={tenantContext} />'
);

// 4. FinishModal V2
const finishModalOldName = 'function FinishModal({ appointment, close, done }';
const finishModalNewName = 'function FinishModalOld({ appointment, close, done }';
code = code.replace(finishModalOldName, finishModalNewName);

code = code.replace(
  '{finish && activeAppointment && <FinishModal',
  '{finish && activeAppointment && <FinishModalV2'
);

code += `\n\nfunction FinishModalV2({ appointment, close, done }: { appointment: Appointment; close: () => void; done: (method: string, val: number, packageId?: string) => void }) {
  const [method, setMethod] = useState("PIX");
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState("");

  useEffect(() => {
    if (appointment.clientId) {
      import('@/lib/actions/packages').then(m => {
        m.getActivePackages(appointment.clientId!).then(pkgs => {
          setPackages(pkgs);
          if (pkgs.length > 0) setSelectedPkg(pkgs[0].id);
        });
      });
    }
  }, [appointment.clientId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg">
        <div className="flex justify-between">
          <div>
            <h2 className="text-lg font-semibold">Concluir atendimento</h2>
            <p className="text-xs text-muted">Revise o recebimento de {appointment.client}.</p>
          </div>
          <button onClick={close}><X size={18} /></button>
        </div>
        <div className="mt-5 rounded-md bg-bg p-4">
          <div className="flex justify-between">
            <span>Total do atendimento</span>
            <b>{money.format(appointment.price)}</b>
          </div>
          <div className="mt-3 flex justify-between border-t border-[#DBE3EC] pt-3 text-base">
            <b>A receber</b>
            <b>{money.format(appointment.price)}</b>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="field-label">Forma de pagamento</span>
          <select value={method} onChange={e => setMethod(e.target.value)} className="field-input">
            <option value="PIX">PIX</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Débito">Débito</option>
            <option value="Crédito">Crédito</option>
            {packages.length > 0 && <option value="Pacote">Abater de Pacote</option>}
          </select>
        </label>
        
        {method === "Pacote" && (
          <label className="mt-4 block">
            <span className="field-label">Escolha o Pacote</span>
            <select value={selectedPkg} onChange={e => setSelectedPkg(e.target.value)} className="field-input">
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.remaining_sessions} restantes)</option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-[#DBE3EC] p-3">
            <p className="text-muted">Comissão gerada</p>
            <b>{money.format(appointment.price * 0.3)}</b>
          </div>
          <div className="rounded-md border border-[#DBE3EC] p-3">
            <p className="text-muted">Status do sistema</p>
            <b>Caixa aberto</b>
          </div>
        </div>
        <button disabled={submitting} onClick={async () => { 
          setSubmitting(true); 
          await done(method, appointment.price, method === "Pacote" ? selectedPkg : undefined); 
        }} className="btn-primary mt-5 w-full">
          <Check size={16} />{submitting ? "Processando..." : "Confirmar e concluir"}
        </button>
      </div>
    </div>
  );
}\n`;

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
