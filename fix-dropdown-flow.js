const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Agenda signature for onStatusChange
content = content.replace(
  'onStatusChange: (id: string, status: string) => void',
  'onStatusChange: (a: Appointment, status: string) => void'
);

// Update Agenda dropdown onChange
content = content.replace(
  'onChange={(e) => onStatusChange(a.id, e.target.value)}',
  'onChange={(e) => onStatusChange(a, e.target.value)}'
);

// Update onStatusChange handler in NailStudioApp
const oldHandler = `onStatusChange={async (id, statusUI) => {
    const map: Record<string, string> = {
      "Aguardando sinal": "awaiting_deposit",
      "Agendado": "scheduled",
      "Confirmado": "confirmed",
      "Cliente chegou": "arrived",
      "Em atendimento": "in_progress",
      "Concluído": "completed"
    };
    const dbStatus = map[statusUI];
    if (dbStatus) {
      setRows(current => current.map(item => item.id === id ? { ...item, status: statusUI as any } : item));
      await updateAppointmentStatus(id, dbStatus);
    }
  }}`;

const newHandler = `onStatusChange={async (a, statusUI) => {
    if (statusUI === "Concluído") {
      // Intercept to open payment/checkout modal
      setActiveAppointment(a);
      setFinish(true);
      return;
    }

    const map: Record<string, string> = {
      "Aguardando sinal": "awaiting_deposit",
      "Agendado": "scheduled",
      "Confirmado": "confirmed",
      "Cliente chegou": "arrived",
      "Em atendimento": "in_progress",
      "Concluído": "completed"
    };
    const dbStatus = map[statusUI];
    if (dbStatus) {
      setRows(current => current.map(item => item.id === a.id ? { ...item, status: statusUI as any } : item));
      await updateAppointmentStatus(a.id, dbStatus);
    }
  }}`;

content = content.replace(oldHandler, newHandler);

// Make sure row click also opens Attendance screen for *any* status if they want, 
// or at least explain that row click does it for Em Atendimento.
// Actually, let's allow clicking the row to go to Attendance if it is in ANY state that is not Completed/Cancelled?
// Let's just fix the dropdown first.

fs.writeFileSync(path, content);
