const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldDone = `setRows(v => v.map(a => a.id === activeAppointment.id ? { ...a, status: "Concluído" } : a));`;
const newDone = `setRows(v => v.map(a => a.id === activeAppointment.id ? { ...a, status: "Concluído", paid: (a.paid || 0) + val } : a));`;

content = content.replace(oldDone, newDone);
fs.writeFileSync(path, content);
