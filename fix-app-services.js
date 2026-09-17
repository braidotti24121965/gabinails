const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Alias services to demoServices
content = content.replace(
  'recovery, services, type Appointment',
  'recovery, services as demoServices, type Appointment'
);

// 2. Import createServiceRecord and type
if (!content.includes('import { createServiceRecord')) {
  content = content.replace(
    'import { createAppointmentRecord,',
    'import { createServiceRecord, type ServiceItem } from "@/lib/actions/services";\nimport { createAppointmentRecord,'
  );
}

// 3. Update signature
content = content.replace(
  'initialAppointments = demoAppointments }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[] }) {',
  'initialAppointments = demoAppointments, initialServices = demoServices as ServiceItem[] }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: ServiceItem[] }) {'
);

// 4. Update state
content = content.replace(
  'const [specialtyList, setSpecialtyList] = useState(() => [...initialSpecialties]);',
  'const [specialtyList, setSpecialtyList] = useState(() => [...initialSpecialties]); const [serviceRows, setServiceRows] = useState(initialServices);'
);

// 5. Update saveEntity for service
content = content.replace(
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: money.format(item.price) }); }',
  'if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.duration.toString() }); }'
);

const serviceSaveOld = `if (kind === "service") { }`; // It probably didn't have an implementation
// Let's replace the whole saveEntity for service if it exists, or add it.
content = content.replace(
  'if (kind === "service") { }',
  `if (kind === "service") {
      if (creating) {
        const res = await createServiceRecord({ name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0 });
        if (res.success) setServiceRows(current => [...current, { id: res.data?.id, name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0, active: true }]);
      }
    }`
);

// 6. Fix references from `services` to `serviceRows` in the file.
// In BookingModal we already pass `services={serviceRows}`! Wait, we do? Let's check BookingModal props!
// Yes: `<BookingModal clients={clientRows} professionals={professionalRows} services={serviceRows}`
// Wait, is there any other place where `services` is used?
// Like `<Services data={services} ...` -> `<Services data={serviceRows} ...`
content = content.replace(
  'if (view === "services") return <Services data={services} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço?", () => { setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço excluído com sucesso."); })} />;',
  'if (view === "services") return <Services data={serviceRows} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço?", () => { setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço excluído com sucesso."); })} />;'
);

content = content.replace(
  '{services.map(s => <option key={s.name}>{s.name}</option>)}',
  '{serviceRows.map(s => <option key={s.name}>{s.name}</option>)}'
);

content = content.replace(
  'const [selectedService, setSelectedService] = useState(services[0]);',
  'const [selectedService, setSelectedService] = useState(serviceRows[0]);'
);

// 7. Fix BookingModal to use real UUID instead of "11111111-1111-4111-8111-111111111111"
content = content.replace(
  'serviceId: "11111111-1111-4111-8111-111111111111"',
  'serviceId: selectedSvc.id'
);

// Also BookingModal initial state used `services[0]?.name` but what if `services` has `id`?
// It does have `id` now!
content = content.replace(
  'const [serviceId, setServiceId] = useState(services[0]?.name || "");',
  'const [serviceId, setServiceId] = useState(services[0]?.id || "");'
);
content = content.replace(
  'const selectedSvc = services.find(s => s.name === serviceId);',
  'const selectedSvc = services.find(s => s.id === serviceId);'
);
content = content.replace(
  '<label className="sm:col-span-2"><span className="field-label">Serviço</span><select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.name} value={s.name}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select></label>',
  '<label className="sm:col-span-2"><span className="field-label">Serviço</span><select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select></label>'
);

fs.writeFileSync(path, content);
