const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldAttendance = `function Attendance({ appointment, onFinish }: { appointment: Appointment | null; onFinish: () => void }) { 
    const [extra, setExtra] = useState(false); 
    if (!appointment) return <div className="p-8 text-center">Nenhum atendimento selecionado</div>;`;

const newAttendance = `function Attendance({ appointment, onFinish, onSelect, allAppointments = [] }: { appointment: Appointment | null; onFinish: () => void; onSelect: (a: Appointment) => void; allAppointments: Appointment[] }) { 
    const [extra, setExtra] = useState(false); 
    if (!appointment) {
      const activeList = allAppointments.filter(a => a.status === "Em atendimento" || a.status === "Cliente chegou");
      return (
        <main className="page-content">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-dark">Atendimentos em andamento</h1>
            <p className="text-muted">Selecione uma cliente para conduzir o serviço.</p>
          </div>
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#DBE3EC] rounded-lg bg-[#F7F9FC]">
              <p className="text-muted mb-2">Nenhum atendimento em andamento no momento.</p>
              <p className="text-sm text-muted">Mude o status de um agendamento na Agenda para "Em atendimento" ou "Cliente chegou".</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeList.map(a => (
                <div key={a.id} onClick={() => onSelect(a)} className="card hover:border-primary hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <Badge tone={a.status === "Em atendimento" ? "green" : "blue"}>{a.status}</Badge>
                    <span className="text-xs font-medium text-muted">{a.time}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-navy-dark">{a.client}</h3>
                  <p className="text-sm text-muted mb-4">{a.service}</p>
                  <div className="flex justify-between items-center text-sm border-t border-bg pt-3">
                    <span className="text-muted">{a.professional}</span>
                    <span className="font-medium text-navy-dark">R$ {a.price.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      );
    }`;

content = content.replace(oldAttendance, newAttendance);

const oldRender = `if (view === "attendance") return <Attendance appointment={activeAppointment} onFinish={() => setFinish(true)} />;`;
const newRender = `if (view === "attendance") return (
      <Attendance 
        appointment={activeAppointment} 
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onFinish={() => setFinish(true)} 
      />
    );`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
