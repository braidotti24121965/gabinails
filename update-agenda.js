const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update imports
content = content.replace(
  'import { appointments as initialAppointments,',
  'import { appointments as demoAppointments,'
);

if (!content.includes('import { createAppointmentRecord')) {
  content = content.replace(
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";',
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";\nimport { createAppointmentRecord, cancelAppointmentRecord } from "@/lib/actions/appointments";'
  );
}

// Update NailStudioApp signature
content = content.replace(
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[] }) {',
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = demoAppointments }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[] }) {'
);

// Update rows state
content = content.replace(
  'const [rows, setRows] = useState(initialAppointments);',
  'const [rows, setRows] = useState(initialAppointments);'
); // Doesn't change because we aliased the prop name

// Update BookingModal usage
content = content.replace(
  '{booking && <BookingModal close={() => setBooking(false)} save={a => { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado e aguardando sinal."); }} />}',
  '{booking && <BookingModal clients={clientRows} professionals={professionalRows} services={serviceRows} close={() => setBooking(false)} save={async (a, rawData) => { if(rawData) { const res = await createAppointmentRecord(rawData); if (res.success) { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado com sucesso."); } else { alert(res.error); } } else { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado (demo)."); } }} />}'
);

// Update BookingModal definition
const oldBookingModal = `function BookingModal({ close, save }: { close: () => void; save: (a: Appointment) => void }) { const [client, setClient] = useState("Sofia Ribeiro"); return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 p-0 sm:items-center sm:p-4"><form onSubmit={e => { e.preventDefault(); save({ id: \`a\${Date.now()}\`, time: "18:15", end: "19:15", client, phone: "(51) 99999-0000", service: "Manutenção em gel", professional: "Gabi Ludwig", status: "Aguardando sinal", price: 130, source: "Interno" }); }} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Novo agendamento</h2><p className="text-xs text-muted">O slot será validado novamente no servidor.</p></div><button type="button" onClick={close} className="rounded-md p-2 text-muted hover:bg-bg"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Cliente</span><input value={client} onChange={e => setClient(e.target.value)} className="field-input" required /></label><label><span className="field-label">Profissional</span><select className="field-input"><option>Gabi Ludwig</option><option>Júlia Mendes</option></select></label><label><span className="field-label">Serviço</span><select className="field-input"><option>Manutenção em gel</option><option>Alongamento em gel</option></select></label><label><span className="field-label">Data</span><input className="field-input" type="date" defaultValue="2026-09-14" /></label><label><span className="field-label">Horário</span><input className="field-input" type="time" step="900" defaultValue="18:15" /></label><label><span className="field-label">Valor</span><input className="field-input" defaultValue="R$ 130,00" /></label></div><div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900"><b>Sinal obrigatório.</b> Cliente não pertence à Whitelist. O agendamento ficará aguardando sinal.</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className="btn-outline">Cancelar</button><button className="btn-primary">Criar agendamento</button></div></form></div> }`;

const newBookingModal = `function BookingModal({ clients, professionals, services, close, save }: { clients: any[]; professionals: any[]; services: any[]; close: () => void; save: (a: Appointment, rawData?: any) => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [profId, setProfId] = useState(professionals[0]?.id || "");
  const [serviceId, setServiceId] = useState(services[0]?.name || ""); // Using name as ID for demo services
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvc = services.find(s => s.name === serviceId);

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 p-0 sm:items-center sm:p-4"><form onSubmit={async e => {
    e.preventDefault();
    if (!selectedClient || !selectedProf || !selectedSvc) return;
    setSubmitting(true);
    
    // Call save with optimistic UI data and raw data for server action
    await save({
      id: \`temp-\${Date.now()}\`,
      time: timeStr,
      end: "—", // computed later
      client: selectedClient.name,
      phone: selectedClient.phone,
      professional: selectedProf.name,
      service: selectedSvc.name,
      status: "Aguardando sinal",
      price: selectedSvc.price,
      source: "Interno"
    }, {
      clientId,
      professionalId: profId,
      serviceId: "00000000-0000-0000-0000-000000000000", // We need a real service table, dummy for now
      dateStr,
      timeStr,
      durationMinutes: selectedSvc.duration,
      price: selectedSvc.price
    });
  }} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Novo agendamento</h2><p className="text-xs text-muted">Selecione os dados reais do banco.</p></div><button type="button" onClick={close} className="rounded-md p-2 text-muted hover:bg-bg"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label><span className="field-label">Cliente</span><select value={clientId} onChange={e => setClientId(e.target.value)} className="field-input" required>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label><span className="field-label">Profissional</span><select value={profId} onChange={e => setProfId(e.target.value)} className="field-input" required>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="field-label">Serviço</span><select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.name} value={s.name}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select></label>
    <label><span className="field-label">Data</span><input className="field-input" type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} required /></label>
    <label><span className="field-label">Horário</span><input className="field-input" type="time" step="900" value={timeStr} onChange={e=>setTimeStr(e.target.value)} required /></label>
  </div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={close} className="btn-outline">Cancelar</button><button disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Criar agendamento"}</button></div></form></div>
}`;

content = content.replace(oldBookingModal, newBookingModal);

// Update Agenda Component onCancel to call server action
content = content.replace(
  'onCancel: (index: number) => void',
  'onCancel: (index: number, id: string) => void'
);

content = content.replace(
  'onDelete={() => onCancel(index)}',
  'onDelete={() => onCancel(index, item.id)}'
);

content = content.replace(
  'onCancel={index => confirmAction("Cancelar este agendamento?',
  'onCancel={(index, id) => confirmAction("Cancelar este agendamento?'
);

content = content.replace(
  'setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado.");',
  'cancelAppointmentRecord(id).then(res => { if(res.success) { setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado."); } else alert(res.error); })'
);

fs.writeFileSync(path, content);
console.log("Updated Agenda successfully");
