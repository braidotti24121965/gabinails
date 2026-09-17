const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Pass rows to Dashboard
content = content.replace(
  'function Dashboard({ go, stats, onAttendance }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void }) {',
  'function Dashboard({ go, stats, onAttendance, appointments = [] }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void, appointments?: Appointment[] }) {'
);

content = content.replace(
  'if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} onAttendance',
  'if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} appointments={rows} onAttendance'
);

// 2. Fix the top metrics
content = content.replace('value="16" detail="13 confirmados · 2 pendentes"', 'value={appointments.length.toString()} detail="Agendamentos para o dia"');
content = content.replace('value="R$ 1.487" detail="+12% comparado ao último domingo"', 'value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Faturamento bruto"');
content = content.replace('value="R$ 1.217" detail="R$ 270 ainda pendentes"', 'value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Recebimentos no caixa"');
content = content.replace('value="84%" detail="6 horários ainda disponíveis"', 'value="—" detail="Disponível em breve"');

// 3. Fix "Agenda de hoje" list
// Instead of demoAppointments, use appointments.slice(0, 4)
content = content.replace(
  'demoAppointments.slice(1, 5)',
  'appointments.slice(0, 4)'
);

// 4. Fix small metric links
content = content.replace('value="R$ 128"', 'value="—"');
content = content.replace('value="18"', 'value="—"');
content = content.replace('value="71%"', 'value="—"');

// 5. Fix "Clientes para recuperar"
// Replace `recovery` with an empty array or slice
content = content.replace(
  '{recovery.map(r =>',
  '{[].map((r: any) =>'
);

// 6. Fix "Próxima cliente"
const nextClientOld = `<div className="rounded-md bg-primary-light p-4"><button onClick={() => go("clients")} className="flex w-full items-center gap-3 text-left"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">CM</div><div><p className="font-semibold">Clara Martins</p><p className="text-xs text-muted">10:45 · Esmaltação em gel</p></div></button><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => go("attendance")} className="btn-primary"><Check size={15} /> Chegou</button><button onClick={() => go("automations")} className="btn-outline"><MessageCircle size={15} /> WhatsApp</button></div></div>`;
const nextClientNew = `<div className="rounded-md bg-primary-light p-4"><p className="text-sm text-center text-primary-dark">Nenhum atendimento próximo.</p></div>`;
content = content.replace(nextClientOld, nextClientNew);

fs.writeFileSync(path, content);
