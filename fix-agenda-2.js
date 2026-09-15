const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
if(!content.includes('demoAppointments')) {
  content = content.replace(
    'import { appointments as initialAppointments,',
    'import { appointments as demoAppointments,'
  );
}

if (!content.includes('import { createAppointmentRecord')) {
  content = content.replace(
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";',
    'import { createSpecialtyRecord } from "@/lib/actions/specialties";\nimport { createAppointmentRecord, cancelAppointmentRecord } from "@/lib/actions/appointments";'
  );
}

// 2. Component signature
content = content.replace(
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[] }) {',
  'export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = demoAppointments }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[] }) {'
);

// 3. BookingModal invocation
content = content.replace(
  '{booking && <BookingModal close={() => setBooking(false)} save={a => { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado e aguardando sinal."); }} />}',
  '{booking && <BookingModal clients={clientRows} professionals={professionalRows} services={serviceRows} close={() => setBooking(false)} save={async (a, rawData) => { if(rawData) { const res = await createAppointmentRecord(rawData); if (res.success) { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado com sucesso."); } else { alert(res.error); } } else { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado (demo)."); } }} />}'
);

// 5. Update Agenda component onCancel
content = content.replace(
  'onCancel: (index: number) => void',
  'onCancel: (index: number, id: string) => void'
);
content = content.replace(
  'onDelete={() => onCancel(index)}',
  'onDelete={() => onCancel(index, item.id)}'
);

// 6. Update onCancel invocation in NailStudioApp
content = content.replace(
  'onCancel={index => confirmAction("Cancelar este agendamento?',
  'onCancel={(index, id) => confirmAction("Cancelar este agendamento?'
);
content = content.replace(
  'setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado.");',
  'cancelAppointmentRecord(id).then(res => { if(res.success) { setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado."); } else alert(res.error); })'
);

fs.writeFileSync(path, content);
