const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `    if (dbStatus) {
      setRows(current => current.map(item => item.id === a.id ? { ...item, status: statusUI as any } : item));
      await updateAppointmentStatus(a.id, dbStatus);
    }`;

const newLogic = `    if (dbStatus) {
      setRows(current => current.map(item => item.id === a.id ? { ...item, status: statusUI as any } : item));
      updateAppointmentStatus(a.id, dbStatus); // Don't block UI waiting for this
      
      if (statusUI === "Em atendimento" || statusUI === "Cliente chegou") {
        setActiveAppointment(a);
        setView("attendance");
      }
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content);
