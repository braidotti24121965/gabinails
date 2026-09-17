const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('addServiceToAppointment')) {
  content = content.replace(
    'updateAppointmentRecord } from "@/lib/actions/appointments";',
    'updateAppointmentRecord, addServiceToAppointment } from "@/lib/actions/appointments";'
  );
}

// Update Attendance signature
content = content.replace(
  'function Attendance({ appointment, onFinish, onSelect, onStatusChange, allAppointments = [] }: { appointment: Appointment | null; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; allAppointments: Appointment[] }) {',
  'function Attendance({ appointment, services, onFinish, onSelect, onStatusChange, onAddExtra, allAppointments = [] }: { appointment: Appointment | null; services: any[]; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; onAddExtra: (service: any) => void; allAppointments: Appointment[] }) {'
);

// Update Attendance state and UI
const oldExtraState = 'const [extra, setExtra] = useState(false);';
const newExtraState = 'const [addingExtra, setAddingExtra] = useState(false); const [extraServices, setExtraServices] = useState<any[]>([]);';
content = content.replace(oldExtraState, newExtraState);

const oldExtraUI = `{extra && <div className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">Nail art premium</p><p className="text-xs text-muted">{appointment.professional} · adicional</p></div><p className="font-semibold">R$ 50,00</p></div></div>}<button onClick={() => setExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button>`;
const newExtraUI = `{extraServices.map((ex, i) => (
  <div key={i} className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">{ex.name}</p><p className="text-xs text-muted">{appointment.professional} · adicional</p></div><p className="font-semibold">R$ {ex.price.toFixed(2).replace(".", ",")}</p></div></div>
))}
{addingExtra ? (
  <div className="mt-3 flex gap-2">
    <select className="field-input flex-1" onChange={(e) => {
      const svc = services.find((s: any) => s.id === e.target.value);
      if (svc) {
        setExtraServices(current => [...current, svc]);
        onAddExtra(svc);
        setAddingExtra(false);
      }
    }}>
      <option value="">Selecione um adicional...</option>
      {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>)}
    </select>
    <button onClick={() => setAddingExtra(false)} className="btn-outline !px-3"><X size={16}/></button>
  </div>
) : (
  <button onClick={() => setAddingExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button>
)}`;
content = content.replace(oldExtraUI, newExtraUI);

// Update Attendance price calculation in UI
content = content.replace(
  '<span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div>',
  '<span>{money.format(appointment.price + extraServices.reduce((a, s) => a + s.price, 0))}</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(appointment.price + extraServices.reduce((a, s) => a + s.price, 0))}</span></div>'
);

// Update NailStudioApp render block
const oldRender = `<Attendance 
        appointment={activeAppointment} 
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onStatusChange={(newStatus) => {`;

const newRender = `<Attendance 
        appointment={activeAppointment} 
        services={serviceRows}
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onAddExtra={async (svc) => {
          if (!activeAppointment) return;
          const profId = professionalRows.find(p => p.name === activeAppointment.professional)?.id;
          if (profId) {
            // optimistically update rows
            const newPrice = activeAppointment.price + svc.price;
            const newService = activeAppointment.service + " + " + svc.name;
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService } : item));
            setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService });
            await addServiceToAppointment(activeAppointment.id, profId, svc.id, svc.price, svc.duration);
          }
        }}
        onStatusChange={(newStatus) => {`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
