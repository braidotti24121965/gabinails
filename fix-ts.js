const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Fix signature
code = code.replace(
  'function Attendance({ appointment, services, onFinish, onSelect, onStatusChange, onAddExtra, allAppointments = [] }: { appointment: Appointment | null; services: any[]; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; onAddExtra: (service: any) => void; allAppointments: Appointment[] }) {',
  'function Attendance({ appointment, services, onFinish, onSelect, onStatusChange, onAddExtra, onRemoveItem, allAppointments = [] }: { appointment: Appointment | null; services: any[]; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; onAddExtra: (service: any) => void; onRemoveItem: (itemId: string) => void; allAppointments: Appointment[] }) {'
);

// Fix setExtraServices
code = code.replace('setExtraServices(current => [...current, svc]);', '');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
