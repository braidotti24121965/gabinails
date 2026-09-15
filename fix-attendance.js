const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('import { finishAppointment }')) {
  content = content.replace(
    'import { createAppointmentRecord, cancelAppointmentRecord } from "@/lib/actions/appointments";',
    'import { createAppointmentRecord, cancelAppointmentRecord } from "@/lib/actions/appointments";\nimport { finishAppointment } from "@/lib/actions/attendance";'
  );
}

// State for activeAppointment
if (!content.includes('const [activeAppointment, setActiveAppointment] = useState')) {
  content = content.replace(
    'const [finish, setFinish] = useState(false);',
    'const [finish, setFinish] = useState(false); const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);'
  );
}

// Fix Dashboard
content = content.replace(
  'onClick={() => go(a.status === "Em atendimento" ? "attendance" : "agenda")}',
  'onClick={() => { if(a.status === "Em atendimento" || a.status === "Aguardando atendimento") { setActiveAppointment(a); go("attendance"); } else go("agenda"); }}'
);

// Fix Agenda prop & invocation
content = content.replace(
  'onAttendance: () => void',
  'onAttendance: (a: Appointment) => void'
);
content = content.replace(
  'onClick={a.status === "Em atendimento" ? onAttendance : () => onAction("view", index)}',
  'onClick={a.status === "Em atendimento" || a.status === "Aguardando atendimento" ? () => onAttendance(a) : () => onAction("view", index)}'
);

// Fix NailStudioApp passing to Agenda
content = content.replace(
  'onAttendance={() => setView("attendance")}',
  'onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }}'
);

// Fix Attendance rendering
content = content.replace(
  'if (view === "attendance") return <Attendance onFinish={() => setFinish(true)} />;',
  'if (view === "attendance") return <Attendance appointment={activeAppointment} onFinish={() => setFinish(true)} />;'
);

// Fix Attendance component definition
content = content.replace(
  'function Attendance({ onFinish }: { onFinish: () => void }) { const [extra, setExtra] = useState(false); return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="primary">Em atendimento</Badge><p className="mt-2 text-xs text-muted">Chegada 09:27 · Início 09:34</p></div><button onClick={onFinish} className="btn-primary"><Check size={16} />Concluir atendimento</button></div><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="card"><SectionTitle title="Ana Paula Souza" subtitle="12 atendimentos · Cliente Whitelist" /><div className="rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">Manutenção em gel</p><p className="text-xs text-muted">Gabi Ludwig · 60 min</p></div><p className="font-semibold">R$ 130,00</p></div></div>{extra && <div className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">Nail art premium</p><p className="text-xs text-muted">Gabi Ludwig · adicional</p></div><p className="font-semibold">R$ 50,00</p></div></div>}<button onClick={() => setExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button><div className="mt-6"><label className="field-label">Observações do atendimento</label><textarea className="field-input h-24 py-2.5" placeholder="Preferências, intercorrências ou detalhes..." /></div><div className="mt-5 rounded-md border border-dashed border-[#C8D5E3] p-5 text-center"><Sparkles className="mx-auto text-primary" size={20} /><p className="mt-2 text-xs font-medium">Fotos antes e depois</p><p className="text-[11px] text-muted">Anexe imagens ao histórico desta cliente</p><button className="btn-outline mt-3 !min-h-8">Adicionar fotos</button></div></section><aside className="card h-fit"><SectionTitle title="Resumo financeiro" /><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">Serviços</span><span>{money.format(extra ? 180 : 130)}</span></div><div className="flex justify-between"><span className="text-muted">Sinal recebido</span><span className="text-primary">− R$ 30,00</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(extra ? 150 : 100)}</span></div></div><div className="mt-5 rounded-md bg-bg p-3 text-xs text-muted"><p className="font-medium text-ink">Ao concluir</p><p className="mt-1">Comissão calculada, estoque baixado e próxima manutenção sugerida para 05/10.</p></div></aside></div></main> }',
  `function Attendance({ appointment, onFinish }: { appointment: Appointment | null; onFinish: () => void }) { 
    const [extra, setExtra] = useState(false); 
    if (!appointment) return <div className="p-8 text-center">Nenhum atendimento selecionado</div>;
    return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="primary">{appointment.status}</Badge><p className="mt-2 text-xs text-muted">Horário agendado: {appointment.time}</p></div><button onClick={onFinish} className="btn-primary"><Check size={16} />Concluir atendimento</button></div><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="card"><SectionTitle title={appointment.client} subtitle={appointment.phone} /><div className="rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{appointment.service}</p><p className="text-xs text-muted">{appointment.professional}</p></div><p className="font-semibold">{money.format(appointment.price)}</p></div></div>{extra && <div className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">Nail art premium</p><p className="text-xs text-muted">{appointment.professional} · adicional</p></div><p className="font-semibold">R$ 50,00</p></div></div>}<button onClick={() => setExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button><div className="mt-6"><label className="field-label">Observações do atendimento</label><textarea className="field-input h-24 py-2.5" placeholder="Preferências, intercorrências ou detalhes..." /></div><div className="mt-5 rounded-md border border-dashed border-[#C8D5E3] p-5 text-center"><Sparkles className="mx-auto text-primary" size={20} /><p className="mt-2 text-xs font-medium">Fotos antes e depois</p><p className="text-[11px] text-muted">Anexe imagens ao histórico desta cliente</p><button className="btn-outline mt-3 !min-h-8">Adicionar fotos</button></div></section><aside className="card h-fit"><SectionTitle title="Resumo financeiro" /><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">Serviços</span><span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div></div><div className="mt-5 rounded-md bg-bg p-3 text-xs text-muted"><p className="font-medium text-ink">Ao concluir</p><p className="mt-1">Comissão calculada e estoque baixado.</p></div></aside></div></main> }`
);

// Fix FinishModal
content = content.replace(
  'function FinishModal({ close, done }: { close: () => void; done: () => void }) { const [method, setMethod] = useState("PIX"); return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg"><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Concluir atendimento</h2><p className="text-xs text-muted">Revise o recebimento antes de finalizar.</p></div><button onClick={close}><X size={18} /></button></div><div className="mt-5 rounded-md bg-bg p-4"><div className="flex justify-between"><span>Total do atendimento</span><b>R$ 130,00</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-muted">Sinal já recebido</span><span className="text-primary">− R$ 30,00</span></div><div className="mt-3 flex justify-between border-t border-[#DBE3EC] pt-3 text-base"><b>A receber</b><b>R$ 100,00</b></div></div><label className="mt-4 block"><span className="field-label">Forma de pagamento</span><select value={method} onChange={e => setMethod(e.target.value)} className="field-input"><option>PIX</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option></select></label><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Comissão gerada</p><b>R$ 45,50</b></div><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Próxima manutenção</p><b>05/10/2026</b></div></div><button onClick={done} className="btn-primary mt-5 w-full"><Check size={16} />Confirmar e concluir</button></div></div> }',
  `function FinishModal({ appointment, close, done }: { appointment: Appointment; close: () => void; done: (method: string, val: number) => void }) { 
    const [method, setMethod] = useState("PIX"); 
    const [submitting, setSubmitting] = useState(false);
    return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg"><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Concluir atendimento</h2><p className="text-xs text-muted">Revise o recebimento de {appointment.client}.</p></div><button onClick={close}><X size={18} /></button></div><div className="mt-5 rounded-md bg-bg p-4"><div className="flex justify-between"><span>Total do atendimento</span><b>{money.format(appointment.price)}</b></div><div className="mt-3 flex justify-between border-t border-[#DBE3EC] pt-3 text-base"><b>A receber</b><b>{money.format(appointment.price)}</b></div></div><label className="mt-4 block"><span className="field-label">Forma de pagamento</span><select value={method} onChange={e => setMethod(e.target.value)} className="field-input"><option>PIX</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option></select></label><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Comissão gerada</p><b>{money.format(appointment.price * 0.3)}</b></div><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Status do sistema</p><b>Caixa aberto</b></div></div><button disabled={submitting} onClick={async () => { setSubmitting(true); await done(method, appointment.price); }} className="btn-primary mt-5 w-full"><Check size={16} />{submitting ? "Processando..." : "Confirmar e concluir"}</button></div></div> }`
);

// Fix FinishModal invocation
content = content.replace(
  '{finish && <FinishModal close={() => setFinish(false)} done={() => { setRows(v => v.map(a => a.id === "a2" ? { ...a, status: "Concluído", paid: 130 } : a)); setFinish(false); setView("agenda"); notify("Atendimento concluído, pagamento e estoque registrados."); }} />}',
  '{finish && activeAppointment && <FinishModal appointment={activeAppointment} close={() => setFinish(false)} done={async (method, val) => { const res = await finishAppointment({ appointmentId: activeAppointment.id, amount: val, paymentMethod: method }); if (res.success) { setRows(v => v.map(a => a.id === activeAppointment.id ? { ...a, status: "Concluído" } : a)); setFinish(false); setActiveAppointment(null); setView("agenda"); notify("Atendimento concluído e pagamento registrado com sucesso."); } else { alert(res.error); } }} />}'
);

fs.writeFileSync(path, content);
