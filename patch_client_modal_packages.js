const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const oldTabs = `  <div className="flex gap-4 border-b border-[#E7EDF3] mb-6">
    <button onClick={() => setTab("info")} className={\`pb-2 font-medium border-b-2 transition-colors \${tab === "info" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Dados Pessoais</button>
    <button onClick={() => setTab("anamnese")} className={\`pb-2 font-medium border-b-2 transition-colors \${tab === "anamnese" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Saúde (Anamnese)</button>
  </div>`;

const newTabs = `  <div className="flex gap-4 border-b border-[#E7EDF3] mb-6 overflow-x-auto">
    <button type="button" onClick={() => setTab("info")} className={\`whitespace-nowrap pb-2 font-medium border-b-2 transition-colors \${tab === "info" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Dados Pessoais</button>
    <button type="button" onClick={() => setTab("anamnese")} className={\`whitespace-nowrap pb-2 font-medium border-b-2 transition-colors \${tab === "anamnese" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Saúde (Anamnese)</button>
    <button type="button" onClick={() => setTab("pacotes")} className={\`whitespace-nowrap pb-2 font-medium border-b-2 transition-colors \${tab === "pacotes" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Pacotes e Combos</button>
  </div>`;

code = code.replace(oldTabs, newTabs);
code = code.replace('<"info"|"anamnese">', '<"info"|"anamnese"|"pacotes">');

const anamnesisEnd = `        <div className="sm:col-span-2 border-t border-[#E7EDF3] pt-4 mt-2">
          <label className="field-label">Observações Gerais (Texto livre)</label>
          <textarea className="field-input h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferências, formato de unha favorito..." disabled={readOnly} />
        </div>
      </div>
    )}`;

const newTabContent = `
    {tab === "pacotes" && (
      <div className="space-y-4">
        {client?.id && !client.id.startsWith("demo-") ? (
          <>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-emerald-900">Vender Novo Pacote</h4>
                <p className="text-xs text-emerald-700">O valor entrará no financeiro como receita hoje.</p>
              </div>
              <button type="button" onClick={() => alert("Simulação: Pacote adicionado! (Recarregue para ver)")} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1.5">
                + Adicionar Pacote
              </button>
            </div>
            
            <h4 className="font-semibold mt-6 mb-2">Pacotes Ativos</h4>
            {(!packages || packages.length === 0) ? (
              <p className="text-sm text-muted text-center py-6 border-2 border-dashed rounded-lg">Esta cliente ainda não possui pacotes.</p>
            ) : (
              <div className="space-y-2">
                {packages.map((p: any) => (
                  <div key={p.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted">Vendido em {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <Badge tone={p.used >= p.total ? "neutral" : "success"}>
                        {p.total - p.used} sessões restantes
                      </Badge>
                      <p className="text-xs text-muted mt-1">{p.used} de {p.total} utilizadas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted text-center py-6">Salve a cliente primeiro para gerenciar seus pacotes.</p>
        )}
      </div>
    )}
`;

code = code.replace(anamnesisEnd, anamnesisEnd + '\n' + newTabContent);

// Add packages to state
const stateInit = `let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };`;
const newStateInit = `let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };
  let initialPackages = [];`;
code = code.replace(stateInit, newStateInit);

const parseLogic = `initialAnamnesis = { ...initialAnamnesis, ...parsed.anamnesis };
      }`;
const newParseLogic = `initialAnamnesis = { ...initialAnamnesis, ...parsed.anamnesis };
      }
      if (parsed.packages) initialPackages = parsed.packages;`;
code = code.replace(parseLogic, newParseLogic);

const stateVars = `const [anamnesis, setAnamnesis] = useState(initialAnamnesis);`;
const newStateVars = `const [anamnesis, setAnamnesis] = useState(initialAnamnesis);
  const [packages, setPackages] = useState(initialPackages);`;
code = code.replace(stateVars, newStateVars);

const saveLogic = `const finalNotes = JSON.stringify({ text: notes, anamnesis });`;
const newSaveLogic = `const finalNotes = JSON.stringify({ text: notes, anamnesis, packages });`;
code = code.replace(saveLogic, newSaveLogic);


fs.writeFileSync('src/components/nail-studio-app.tsx', code);
