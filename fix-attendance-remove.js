const fs = require('fs');

// 1. Update Appointment type
let demoData = fs.readFileSync('src/lib/demo-data.ts', 'utf8');
demoData = demoData.replace('export interface Appointment {', 'export interface Appointment { items?: { id: string; name: string; price: number }[];');
fs.writeFileSync('src/lib/demo-data.ts', demoData);

// 2. Update getAppointments to return items
let appActions = fs.readFileSync('src/lib/actions/appointments.ts', 'utf8');
appActions = appActions.replace(
  'items:appointment_items(\n        service:services(name),\n        unit_price\n      )',
  'items:appointment_items(\n        id,\n        service:services(name),\n        unit_price\n      )'
);
appActions = appActions.replace(
  'source: row.source === "online" ? "Online" : "Interno"',
  'source: row.source === "online" ? "Online" : "Interno",\n      items: row.items?.map((i: any) => ({ id: i.id, name: i.service?.name || "Serviço", price: Number(i.unit_price) })) || []'
);
// Add remove action
appActions += `
export async function removeServiceFromAppointment(itemId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  await supabase.from("appointment_items").delete().eq("id", itemId);
  revalidatePath("/");
  return { success: true };
}
`;
fs.writeFileSync('src/lib/actions/appointments.ts', appActions);

// 3. Update Attendance UI
let appUI = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
// add import
appUI = appUI.replace('addServiceToAppointment } from "@/lib/actions/appointments";', 'addServiceToAppointment, removeServiceFromAppointment } from "@/lib/actions/appointments";');

// In Attendance signature, add onRemoveItem
appUI = appUI.replace(
  'onAddExtra: (service: any) => void;',
  'onAddExtra: (service: any) => void; onRemoveItem: (itemId: string) => void;'
);

// Remove the old extraServices logic and just render appointment.items!
appUI = appUI.replace(
  'const [addingExtra, setAddingExtra] = useState(false); const [extraServices, setExtraServices] = useState<any[]>([]);',
  'const [addingExtra, setAddingExtra] = useState(false);'
);

const oldBaseServiceUI = `<div className="rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{appointment.service}</p><p className="text-xs text-muted">{appointment.professional}</p></div><p className="font-semibold">{money.format(appointment.price)}</p></div></div>`;
const oldExtraServicesUI = `{extraServices.map((ex, i) => (
  <div key={i} className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">{ex.name}</p><p className="text-xs text-muted">{appointment.professional} · adicional</p></div><p className="font-semibold">R$ {ex.price.toFixed(2).replace(".", ",")}</p></div></div>
))}`;

const newItemsUI = `
{appointment.items && appointment.items.map((item: any) => (
  <div key={item.id} className="mt-2 rounded-md border border-[#E7EDF3] p-4 group">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted">{appointment.professional}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold">{money.format(item.price)}</p>
        <button onClick={() => { if(confirm("Remover este serviço?")) onRemoveItem(item.id); }} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
      </div>
    </div>
  </div>
))}
`;

appUI = appUI.replace(oldBaseServiceUI + oldExtraServicesUI, newItemsUI);

// Update price calc
appUI = appUI.replace(/\{money\.format\(appointment\.price \+ extraServices\.reduce\(\(a, s\) => a \+ s\.price, 0\)\)\}/g, '{money.format(appointment.price)}');

// Update NailStudioApp render
const oldRender = `onAddExtra={async (svc) => {
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
        onStatusChange`;

const newRender = `onAddExtra={async (svc) => {
          if (!activeAppointment) return;
          const profId = professionalRows.find(p => p.name === activeAppointment.professional)?.id;
          if (profId) {
            const tempId = "temp-" + Date.now();
            const newPrice = activeAppointment.price + svc.price;
            const newService = activeAppointment.service + " + " + svc.name;
            const newItems = [...(activeAppointment.items || []), { id: tempId, name: svc.name, price: svc.price }];
            
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
            setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });
            
            await addServiceToAppointment(activeAppointment.id, profId, svc.id, svc.price, svc.duration);
            // Refresh to get real IDs
            window.location.reload();
          }
        }}
        onRemoveItem={async (itemId) => {
          if (!activeAppointment) return;
          const removedItem = activeAppointment.items?.find(i => i.id === itemId);
          if (!removedItem) return;
          
          const newPrice = activeAppointment.price - removedItem.price;
          const newItems = activeAppointment.items?.filter(i => i.id !== itemId) || [];
          const newService = newItems.map(i => i.name).join(" + ");
          
          setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
          setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });
          
          await removeServiceFromAppointment(itemId);
        }}
        onStatusChange`;

appUI = appUI.replace(oldRender, newRender);

fs.writeFileSync('src/components/nail-studio-app.tsx', appUI);
