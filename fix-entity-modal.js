const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update EntityModal state interface to include fullItem
content = content.replace(
  'const [entityModal, setEntityModal] = useState<{ kind: string; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string } | null>(null);',
  'const [entityModal, setEntityModal] = useState<{ kind: string; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string; fullItem?: any } | null>(null);'
);

// Pass fullItem to EntityModal when kind is appointment
content = content.replace(
  'if (kind === "appointment") { const item = rows[index]; setEntityModal({ kind, mode, index, name: item.client, detail: item.time }); }',
  'if (kind === "appointment") { const item = rows[index]; setEntityModal({ kind, mode, index, name: item.client, detail: item.time, fullItem: item }); }'
);

// Update EntityModal props
content = content.replace(
  'function EntityModal({ title, mode, initialName, initialDetail, onClose, onSave }: { title: string; mode: "view" | "edit" | "create"; initialName: string; initialDetail: string; onClose: () => void; onSave: (n: string, d: string) => void }) {',
  'function EntityModal({ title, mode, initialName, initialDetail, fullItem, onClose, onSave }: { title: string; mode: "view" | "edit" | "create"; initialName: string; initialDetail: string; fullItem?: any; onClose: () => void; onSave: (n: string, d: string) => void }) {'
);

// Update EntityModal rendering based on kind
// Find the generic input block
const genericInputs = `<div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">{title.includes("Cliente") ? "Nome da cliente" : title.includes("Serviço") ? "Nome do serviço" : "Nome"}</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">{title.includes("Cliente") ? "Telefone" : title.includes("Serviço") ? "Duração (min)" : "Detalhe principal"}</label><input className="field-input" value={detail} onChange={e => setDetail(e.target.value)} disabled={readOnly} /></div></div>`;

const newInputs = `
  {title.includes("Agendamento") && fullItem ? (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="field-label">Cliente</label><input className="field-input" value={fullItem.client} disabled /></div>
      <div><label className="field-label">Profissional</label><input className="field-input" value={fullItem.professional} disabled /></div>
      <div><label className="field-label">Serviço</label><input className="field-input" value={fullItem.service} disabled /></div>
      <div><label className="field-label">Horário</label><input className="field-input" value={fullItem.time + " às " + fullItem.end} disabled /></div>
      <div><label className="field-label">Valor do Serviço</label><input className="field-input" value={"R$ " + fullItem.price.toFixed(2)} disabled /></div>
      <div><label className="field-label">Status</label><input className="field-input" value={fullItem.status} disabled /></div>
      <div className="sm:col-span-2"><p className="text-xs text-muted mt-2">Para alterar essas informações, cancele este agendamento e crie um novo. Em breve, a edição completa estará disponível.</p></div>
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">{title.includes("Cliente") ? "Nome da cliente" : title.includes("Serviço") ? "Nome do serviço" : "Nome"}</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">{title.includes("Cliente") ? "Telefone" : title.includes("Serviço") ? "Duração (min)" : "Detalhe principal"}</label><input className="field-input" value={detail} onChange={e => setDetail(e.target.value)} disabled={readOnly} /></div></div>
  )}
`;

content = content.replace(genericInputs, newInputs);

// Fix EntityModal invocation in NailStudioApp
content = content.replace(
  'title={entityModal.kind === "client" ? "Cliente" : entityModal.kind === "professional" ? "Profissional" : entityModal.kind === "service" ? "Serviço" : "Registro"}',
  'title={entityModal.kind === "client" ? "Cliente" : entityModal.kind === "professional" ? "Profissional" : entityModal.kind === "service" ? "Serviço" : entityModal.kind === "appointment" ? "Agendamento" : "Registro"} fullItem={entityModal.fullItem}'
);

fs.writeFileSync(path, content);
