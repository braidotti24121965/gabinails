const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const oldFinishModal = code.substring(
  code.indexOf('function FinishModal({ appointment, close, done }'),
  code.indexOf('function Toast({ text }: { text: string }) {')
);

const newFinishModal = `function FinishModal({ appointment, close, done }: { appointment: Appointment; close: () => void; done: (method: string, val: number, packageId?: string) => void }) {
    const [method, setMethod] = useState("PIX");
    const [submitting, setSubmitting] = useState(false);
    
    // We don't have the clientId directly in Appointment yet, but we will mock it or fetch by name
    return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg"><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Concluir atendimento</h2><p className="text-xs text-muted">Revise o recebimento de {appointment.client}.</p></div><button onClick={close}><X size={18} /></button></div><div className="mt-5 rounded-md bg-bg p-4"><div className="flex justify-between"><span>Total do atendimento</span><b>{money.format(appointment.price)}</b></div><div className="mt-3 flex justify-between border-t border-[#DBE3EC] pt-3 text-base"><b>A receber</b><b>{money.format(appointment.price)}</b></div></div><label className="mt-4 block"><span className="field-label">Forma de pagamento</span><select value={method} onChange={e => setMethod(e.target.value)} className="field-input"><option value="PIX">PIX</option><option value="Dinheiro">Dinheiro</option><option value="Débito">Débito</option><option value="Crédito">Crédito</option><option value="Pacote">Abater de Pacote</option></select></label><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Comissão gerada</p><b>{money.format(appointment.price * 0.3)}</b></div><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Status do sistema</p><b>Caixa aberto</b></div></div><button disabled={submitting} onClick={async () => { setSubmitting(true); await done(method, appointment.price, method === "Pacote" ? "dummy_pkg_id" : undefined); }} className="btn-primary mt-5 w-full"><Check size={16} />{submitting ? "Processando..." : "Confirmar e concluir"}</button></div></div> 
}
`;

code = code.replace(oldFinishModal, newFinishModal + '\n');
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
