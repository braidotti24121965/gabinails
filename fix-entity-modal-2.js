const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update EntityModalState
content = content.replace(
  'type EntityModalState = { kind: EntityKind; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string };',
  'type EntityModalState = { kind: EntityKind; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string; fullItem?: any; };'
);

// Update setEntityModal invocation for appointment
content = content.replace(
  'if (kind === "appointment") { const item = rows[index]; setEntityModal({ kind, mode, index, name: item.client, detail: item.time }); }',
  'if (kind === "appointment") { const item = rows[index]; setEntityModal({ kind, mode, index, name: item.client, detail: item.time, fullItem: item }); }'
);

// Update EntityModal definition
const oldEntityModal = `function EntityModal({ state, close, save }: { state: EntityModalState; close: () => void; save: (name: string, detail: string) => void }) {
  const [name, setName] = useState(state.name); const [detail, setDetail] = useState(state.detail); const readOnly = state.mode === "view";
  const detailLabel = state.kind === "client" ? "WhatsApp" : state.kind === "service" || state.kind === "financial" ? "Valor" : state.kind === "professional" ? "Especialidade" : state.kind === "product" ? "Estoque atual" : state.kind === "automation" ? "Canal" : "Horário";
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{state.mode === "create" ? "Novo cadastro" : state.mode === "view" ? "Detalhes" : "Edição"}</Badge><h2 className="mt-2 text-xl font-bold">{state.name || "Novo registro"}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4"><div><label className="field-label">Nome</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">{detailLabel}</label><input className="field-input" value={detail} onChange={e => setDetail(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">Observações</label><textarea className="field-input h-24" placeholder="Informações adicionais do cadastro" disabled={readOnly} /></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button>{!readOnly && <button onClick={() => save(name, detail)} className="btn-primary"><Check size={16} />Salvar alterações</button>}</div></div></div>;
}`;

const newEntityModal = `function EntityModal({ state, close, save }: { state: EntityModalState; close: () => void; save: (name: string, detail: string) => void }) {
  const [name, setName] = useState(state.name); const [detail, setDetail] = useState(state.detail); const readOnly = state.mode === "view";
  const detailLabel = state.kind === "client" ? "WhatsApp" : state.kind === "service" || state.kind === "financial" ? "Valor" : state.kind === "professional" ? "Especialidade" : state.kind === "product" ? "Estoque atual" : state.kind === "automation" ? "Canal" : "Horário";
  
  if (state.kind === "appointment" && state.fullItem) {
    return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{state.mode === "view" ? "Detalhes do Agendamento" : "Edição Restrita"}</Badge><h2 className="mt-2 text-xl font-bold">{state.fullItem.client}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="field-label">Profissional</label><input className="field-input" value={state.fullItem.professional} disabled /></div><div><label className="field-label">Status</label><input className="field-input" value={state.fullItem.status} disabled /></div><div><label className="field-label">Horário</label><input className="field-input" value={state.fullItem.time + " às " + state.fullItem.end} disabled /></div><div><label className="field-label">Valor</label><input className="field-input" value={money.format(state.fullItem.price)} disabled /></div><div className="col-span-2"><label className="field-label">Serviço</label><input className="field-input" value={state.fullItem.service} disabled /></div></div><div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-medium mb-1">Modo de Visualização</p>Para alterar o horário, profissional ou serviço, você precisa cancelar este agendamento (lixeira) e criar um novo. A funcionalidade de remarcação e edição completa será implementada no próximo ciclo.</div></div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Fechar</button></div></div></div>;
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{state.mode === "create" ? "Novo cadastro" : state.mode === "view" ? "Detalhes" : "Edição"}</Badge><h2 className="mt-2 text-xl font-bold">{state.name || "Novo registro"}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4"><div><label className="field-label">Nome</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">{detailLabel}</label><input className="field-input" value={detail} onChange={e => setDetail(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">Observações</label><textarea className="field-input h-24" placeholder="Informações adicionais do cadastro" disabled={readOnly} /></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button>{!readOnly && <button onClick={() => save(name, detail)} className="btn-primary"><Check size={16} />Salvar alterações</button>}</div></div></div>;
}`;

content = content.replace(oldEntityModal, newEntityModal);

fs.writeFileSync(path, content);
