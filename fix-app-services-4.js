const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Alias services to demoServices
content = content.replace(
  'recovery, services, type Appointment',
  'recovery, services as demoServices, type Appointment'
);

// 2. Import createServiceRecord and type
content = content.replace(
  'import { createAppointmentRecord,',
  'import { createServiceRecord, type ServiceItem } from "@/lib/actions/services";\nimport { createAppointmentRecord,'
);

// 3. Update NailStudioApp signature
content = content.replace(
  'initialAppointments = demoAppointments }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[] }) {',
  'initialAppointments = demoAppointments, initialServices = demoServices as any[] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[] }) {'
);

// 4. Update the existing serviceRows state
content = content.replace(
  'const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...services]);',
  'const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...initialServices]);'
);

// 5. Fix usages
content = content.replace(
  'function Services({ data, onNew, onAction, onDelete }: { data: typeof services;',
  'function Services({ data, onNew, onAction, onDelete }: { data: any[];'
);

// Fix ProfessionalModal usage of services
content = content.replace(
  '{services.map(s => (',
  '{demoServices.map(s => ('
);

// Fix OnlineBooking usage of services
content = content.replace(
  'const [selectedService, setSelectedService] = useState(services[0]);',
  'const [selectedService, setSelectedService] = useState(demoServices[0]);'
);

// Fix Agenda top filters (which used services.map)
content = content.replace(
  '{services.map(s => <option key={s.name}>{s.name}</option>)}',
  '{demoServices.map(s => <option key={s.name}>{s.name}</option>)}'
);

// 6. Fix BookingModal
content = content.replace(
  'const [serviceId, setServiceId] = useState(services[0]?.name || "");',
  'const [serviceId, setServiceId] = useState(services[0]?.id || "");'
);
content = content.replace(
  'const selectedSvc = services.find(s => s.name === serviceId);',
  'const selectedSvc = services.find(s => s.id === serviceId);'
);
content = content.replace(
  '<select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.name} value={s.name}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select>',
  '<select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select>'
);
content = content.replace(
  'serviceId: "11111111-1111-4111-8111-111111111111"',
  'serviceId: selectedSvc.id'
);

// 7. Fix saveEntity
content = content.replace(
  'if (kind === "service") { const price = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0; setServiceRows(current => creating ? [...current, { name, category: "Novo", duration: 60, price, maintenance: 21, active: true }] : current.map((item, i) => i === index ? { ...item, name, price } : item)); }',
  `if (kind === "service") { 
    if (creating) {
      const res = await createServiceRecord({ name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0 });
      if (res.success) setServiceRows(current => [...current, { id: res.data?.id || "tmp", name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0, active: true }]);
    }
  }`
);
content = content.replace(
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: money.format(item.price) }); }',
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.duration.toString() }); }'
);

fs.writeFileSync(path, content);
