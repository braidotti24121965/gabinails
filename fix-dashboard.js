const fs = require('fs');

// Fix appointments action mapping
const pathA = 'src/lib/actions/appointments.ts';
let act = fs.readFileSync(pathA, 'utf8');
act = act.replace('arrived: "Aguardando atendimento"', 'arrived: "Cliente chegou"');
fs.writeFileSync(pathA, act);

// Fix TS errors in UI
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Dashboard signature and usage
content = content.replace(
  'function Dashboard({ go }: { go: (v: View) => void }) {',
  'function Dashboard({ go, onAttendance }: { go: (v: View) => void, onAttendance?: (a: Appointment) => void }) {'
);

// Fix Dashboard invocation
content = content.replace(
  'if (view === "dashboard") return <Dashboard go={setView} />;',
  'if (view === "dashboard") return <Dashboard go={setView} onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }} />;'
);

content = content.replace(
  /onClick=\{\(\) => \{ if\(a\.status === "Em atendimento" \|\| a\.status === "Aguardando atendimento"\) \{ setActiveAppointment\(a\); go\("attendance"\); \} else go\("agenda"\); \}\}/g,
  'onClick={() => { if(a.status === "Em atendimento" || a.status === "Cliente chegou") { if (onAttendance) onAttendance(a); } else go("agenda"); }}'
);

content = content.replace(
  'onClick={a.status === "Em atendimento" || a.status === "Aguardando atendimento" ? () => onAttendance(a) : () => onAction("view", index)}',
  'onClick={a.status === "Em atendimento" || a.status === "Cliente chegou" ? () => onAttendance(a) : () => onAction("view", index)}'
);

fs.writeFileSync(path, content);
