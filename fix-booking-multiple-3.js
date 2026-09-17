const fs = require('fs');

const uiPath = 'src/components/nail-studio-app.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Fix validation line
uiContent = uiContent.replace(
  'if (!selectedClient || !selectedProf || !selectedSvc) return;',
  'if (!selectedClient || !selectedProf || selectedSvcs.length === 0) return;'
);

// Fix save block manually since replace didn't match the exact text
uiContent = uiContent.replace('end: new Date(new Date(`2000-01-01T${timeStr}:00`).getTime() + selectedSvc.duration * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),',
'end: new Date(new Date(`2000-01-01T${timeStr}:00`).getTime() + totalDuration * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),');

uiContent = uiContent.replace('service: selectedSvc.name,', 'service: serviceNames,');
uiContent = uiContent.replace('price: selectedSvc.price,', 'price: totalPrice,');
uiContent = uiContent.replace('serviceId: selectedSvc.id, // Dummy UUID for MVP until we do services table', 'services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),');
uiContent = uiContent.replace('durationMinutes: selectedSvc.duration,', 'durationMinutes: totalDuration,');
uiContent = uiContent.replace('price: selectedSvc.price', 'price: totalPrice');

fs.writeFileSync(uiPath, uiContent);
