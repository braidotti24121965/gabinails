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

// 3. Update signature
content = content.replace(
  'initialAppointments = demoAppointments }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[] }) {',
  'initialAppointments = demoAppointments, initialServices = demoServices as ServiceItem[] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: ServiceItem[] }) {'
);

// 4. Update the existing serviceRows state
content = content.replace(
  'const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...services]);',
  'const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...initialServices]);'
);

// 5. Replace references to 'services' with 'serviceRows' or 'demoServices'
// In Dashboard: {services.map} => {serviceRows.map} (wait, is there a services.map in Dashboard?)
// Let's replace 'services.map' with 'serviceRows.map' everywhere.
content = content.replace(/services\.map/g, 'serviceRows.map');
content = content.replace(/services\[0\]/g, 'serviceRows[0]');
content = content.replace(/services\.find/g, 'serviceRows.find');

// Also update `typeof services` to `typeof demoServices` in the `Services` component prop type
content = content.replace(
  '{ data: typeof services;',
  '{ data: any[];'
);

// 6. Update BookingModal to use ID instead of Name
content = content.replace(
  'const [serviceId, setServiceId] = useState(serviceRows[0]?.name || "");',
  'const [serviceId, setServiceId] = useState(serviceRows[0]?.id || "");'
);
content = content.replace(
  'const selectedSvc = serviceRows.find(s => s.name === serviceId);',
  'const selectedSvc = serviceRows.find(s => s.id === serviceId);'
);
content = content.replace(
  '<select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{serviceRows.map(s => <option key={s.name} value={s.name}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select>',
  '<select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{serviceRows.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select>'
);

// Also update the submission
content = content.replace(
  'serviceId: "11111111-1111-4111-8111-111111111111"',
  'serviceId: selectedSvc.id'
);

// 7. Update saveEntity for Service
content = content.replace(
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: money.format(item.price) }); }',
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.duration.toString() }); }'
);

content = content.replace(
  'if (kind === "service") { }',
  `if (kind === "service") {
      if (creating) {
        const res = await createServiceRecord({ name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0 });
        if (res.success) setServiceRows(current => [...current, { id: res.data?.id, name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0, active: true }]);
      }
    }`
);

fs.writeFileSync(path, content);
