const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const oldModal = code.substring(
  code.indexOf('function ClientModal({ mode, client, close, save }'),
  code.indexOf('function EntityModal({ state, close, save }')
);

const newModal = `function ClientModal({ mode, client, close, save }: { mode: "create" | "edit" | "view"; client?: any; close: () => void; save: (data: any) => Promise<void> }) {
  const [tab, setTab] = useState<"info"|"anamnese">("info");
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [birthDate, setBirthDate] = useState(client?.birthDate || "");
  const [email, setEmail] = useState(client?.email || "");
  const [cep, setCep] = useState(client?.cep || "");
  const [street, setStreet] = useState(client?.street || "");
  const [number, setNumber] = useState(client?.number || "");
  const [complement, setComplement] = useState(client?.complement || "");
  const [neighborhood, setNeighborhood] = useState(client?.neighborhood || "");
  const [city, setCity] = useState(client?.city || "");
  const [state, setState] = useState(client?.state || "");
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Anamnesis state
  const rawNotes = client?.notes || "";
  let initialNotes = rawNotes;
  let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };
  try {
    if (rawNotes.startsWith("{")) {
      const parsed = JSON.parse(rawNotes);
      if (parsed.anamnesis) {
        initialNotes = parsed.text || "";
        initialAnamnesis = { ...initialAnamnesis, ...parsed.anamnesis };
      }
    }
  } catch(e) {}
  
  const [notes, setNotes] = useState(initialNotes);
  const [anamnesis, setAnamnesis] = useState(initialAnamnesis);

  const readOnly = mode === "view";
  const clientAge = formatAgeInYearsAndMonths(birthDate);

  const handlePhone = (v: string) => {
    let num = v.replace(/\\D/g, "");
    if (num.length > 11) num = num.slice(0, 11);
    if (num.length > 2) num = \`(\${num.slice(0, 2)}) \${num.slice(2)}\`;
    if (num.length > 10) num = \`\${num.slice(0, 10)}-\${num.slice(10)}\`;
    setPhone(num);
  };

  const handleCep = async (v: string) => {
    setCep(v);
    const cleanCep = v.replace(/\\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(\`https://viacep.com.br/ws/\${cleanCep}/json/\`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
          document.getElementById("address-number")?.focus();
        }
      } catch (e) { console.error(e); }
      setLoadingCep(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"><button onClick={close} className="fixed inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 my-8">
  <div className="mb-6 flex items-start justify-between">
    <div>
      <Badge tone="primary">{mode === "create" ? "Nova Cliente" : mode === "view" ? "Detalhes" : "Edição"}</Badge>
      <h2 className="mt-2 text-xl font-bold">{name || "Novo registro"}</h2>
    </div>
    <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
  </div>
  
  <div className="flex gap-4 border-b border-[#E7EDF3] mb-6">
    <button onClick={() => setTab("info")} className={\`pb-2 font-medium border-b-2 transition-colors \${tab === "info" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Dados Pessoais</button>
    <button onClick={() => setTab("anamnese")} className={\`pb-2 font-medium border-b-2 transition-colors \${tab === "anamnese" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}\`}>Saúde (Anamnese)</button>
  </div>

  <form onSubmit={async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const finalNotes = JSON.stringify({ text: notes, anamnesis });
    await save({ name, phone, birthDate, cep, street, number, complement, neighborhood, city, state, notes: finalNotes, email });
    setSubmitting(false);
  }} className="space-y-4">
    
    {tab === "info" && (
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="field-label">Nome Completo</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} required disabled={readOnly} /></div>
        <div><label className="field-label">WhatsApp</label><input className="field-input" value={phone} onChange={e => handlePhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={15} required disabled={readOnly} /></div>
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <label className="field-label">Data de Nascimento</label>
            <span className="field-label w-[7.75rem]">Idade</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" className="field-input min-w-0 flex-1" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={readOnly} />
            <output className="w-[7.75rem] shrink-0 whitespace-nowrap text-xs font-medium text-muted" aria-live="polite">
              {clientAge || "—"}
            </output>
          </div>
        </div>
        <div><label className="field-label">E-mail</label><input type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" disabled={readOnly} /></div>
        <div className="sm:col-span-2 border-t border-[#E7EDF3] pt-4 mt-2">
          <h3 className="text-sm font-semibold mb-3">Endereço</h3>
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2"><label className="field-label">CEP {loadingCep && <span className="text-xs text-primary animate-pulse">(Buscando...)</span>}</label><input className="field-input" value={cep} onChange={e => handleCep(e.target.value)} disabled={readOnly} maxLength={9} placeholder="00000-000" /></div>
            <div className="sm:col-span-4"><label className="field-label">Rua</label><input className="field-input" value={street} onChange={e => setStreet(e.target.value)} disabled={readOnly} /></div>
            <div className="sm:col-span-2"><label className="field-label">Número</label><input id="address-number" className="field-input" value={number} onChange={e => setNumber(e.target.value)} disabled={readOnly} /></div>
            <div className="sm:col-span-4"><label className="field-label">Complemento</label><input className="field-input" value={complement} onChange={e => setComplement(e.target.value)} disabled={readOnly} /></div>
            <div className="sm:col-span-2"><label className="field-label">Bairro</label><input className="field-input" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} disabled={readOnly} /></div>
            <div className="sm:col-span-3"><label className="field-label">Cidade</label><input className="field-input" value={city} onChange={e => setCity(e.target.value)} disabled={readOnly} /></div>
            <div className="sm:col-span-1"><label className="field-label">UF</label><input className="field-input" value={state} onChange={e => setState(e.target.value)} disabled={readOnly} maxLength={2} /></div>
          </div>
        </div>
      </div>
    )}

    {tab === "anamnese" && (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 bg-rose-50 border border-rose-100 p-3 rounded text-sm text-rose-800">
          <strong>Atenção:</strong> Respostas de saúde gerarão alertas visuais automáticos na tela da Agenda.
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-md">
          <input type="checkbox" id="diabetes" checked={anamnesis.diabetes} onChange={e => setAnamnesis({...anamnesis, diabetes: e.target.checked})} disabled={readOnly} className="w-5 h-5 text-primary" />
          <label htmlFor="diabetes" className="font-medium cursor-pointer">Paciente Diabética</label>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-md">
          <input type="checkbox" id="gestante" checked={anamnesis.gestante} onChange={e => setAnamnesis({...anamnesis, gestante: e.target.checked})} disabled={readOnly} className="w-5 h-5 text-primary" />
          <label htmlFor="gestante" className="font-medium cursor-pointer">Gestante</label>
        </div>

        <div className="flex items-center gap-3 p-3 border rounded-md">
          <input type="checkbox" id="roeUnha" checked={anamnesis.roeUnha} onChange={e => setAnamnesis({...anamnesis, roeUnha: e.target.checked})} disabled={readOnly} className="w-5 h-5 text-primary" />
          <label htmlFor="roeUnha" className="font-medium cursor-pointer">Roe unhas (Onicofagia)</label>
        </div>

        <div className="sm:col-span-2 pt-2">
          <label className="field-label text-danger">Alergias conhecidas (Descreva)</label>
          <input className="field-input border-rose-200 focus:border-rose-400" value={anamnesis.alergias} onChange={e => setAnamnesis({...anamnesis, alergias: e.target.value})} placeholder="Ex: Esmalte comum, látex, etc." disabled={readOnly} />
        </div>

        <div className="sm:col-span-2 border-t border-[#E7EDF3] pt-4 mt-2">
          <label className="field-label">Observações Gerais (Texto livre)</label>
          <textarea className="field-input h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferências, formato de unha favorito..." disabled={readOnly} />
        </div>
      </div>
    )}

    <div className="mt-6 flex justify-end gap-3 border-t border-[#E7EDF3] pt-4"><button type="button" onClick={close} className="btn-outline">Cancelar</button>{!readOnly && <button disabled={submitting} type="submit" className="btn-primary">{submitting ? "Salvando..." : <><Check size={16} />Salvar</>}</button>}</div>
  </form></div></div>;
}
`;

code = code.replace(oldModal, newModal);
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
