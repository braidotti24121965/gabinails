const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Attendance signature
content = content.replace(
  'function Attendance({ appointment, onFinish, onSelect, allAppointments = [] }: { appointment: Appointment | null; onFinish: () => void; onSelect: (a: Appointment | null) => void; allAppointments: Appointment[] }) {',
  'function Attendance({ appointment, onFinish, onSelect, onStatusChange, allAppointments = [] }: { appointment: Appointment | null; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; allAppointments: Appointment[] }) {'
);

// Update Attendance detail view Badge -> Select
const oldBadge = `<div><Badge tone="primary">{appointment.status}</Badge>`;
const newSelect = `<div>
            <select 
              value={appointment.status} 
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-sm font-medium bg-primary/10 text-primary border-none rounded-full px-3 py-1 outline-none cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <option value="Cliente chegou">Cliente chegou</option>
              <option value="Em atendimento">Em atendimento</option>
            </select>`;

content = content.replace(oldBadge, newSelect);

// Update NailStudioApp render block for Attendance to pass onStatusChange
const oldRender = `<Attendance 
        appointment={activeAppointment} 
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onFinish={() => setFinish(true)} 
      />`;

const newRender = `<Attendance 
        appointment={activeAppointment} 
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onStatusChange={(newStatus) => {
          if (!activeAppointment) return;
          const map: Record<string, string> = {
            "Cliente chegou": "arrived",
            "Em atendimento": "in_progress",
          };
          const dbStatus = map[newStatus];
          if (dbStatus) {
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, status: newStatus as any } : item));
            setActiveAppointment({ ...activeAppointment, status: newStatus as any });
            updateAppointmentStatus(activeAppointment.id, dbStatus);
          }
        }}
        onFinish={() => setFinish(true)} 
      />`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
