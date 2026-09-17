const fs = require('fs');

// 1. Update backend action
const actionPath = 'src/lib/actions/appointments.ts';
let actionContent = fs.readFileSync(actionPath, 'utf8');

actionContent = actionContent.replace(
  'const serviceName = row.items?.[0]?.service?.name || "Serviço";',
  'const serviceName = row.items?.map((i: any) => i.service?.name).filter(Boolean).join(" + ") || "Serviço";'
);

actionContent = actionContent.replace(
  'serviceId: string;\n  dateStr: string;',
  'services: { id: string; price: number; durationMinutes: number }[];\n  dateStr: string;'
);

const insertSingle = `const { error: itemError } = await supabase
    .from("appointment_items")
    .insert([{
      organization_id: profile.organization_id,
      appointment_id: appointment.id,
      service_id: data.serviceId,
      professional_id: data.professionalId,
      description: "Agendamento",
      duration_minutes: data.durationMinutes,
      unit_price: data.price,
      commission_type: "percentage",
      commission_value: 0 // Ideally this comes from the professional's default commission
    }]);`;

const insertMultiple = `const itemsToInsert = data.services.map((s: any) => ({
      organization_id: profile.organization_id!,
      appointment_id: appointment.id,
      service_id: s.id,
      professional_id: data.professionalId,
      description: "Agendamento",
      duration_minutes: s.durationMinutes,
      unit_price: s.price,
      commission_type: "percentage",
      commission_value: 0
    }));

    const { error: itemError } = await supabase
      .from("appointment_items")
      .insert(itemsToInsert);`;

actionContent = actionContent.replace(insertSingle, insertMultiple);
fs.writeFileSync(actionPath, actionContent);


// 2. Update UI (BookingModal)
const uiPath = 'src/components/nail-studio-app.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf8');

const oldBookingModalDef = `  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [profId, setProfId] = useState(professionals[0]?.id || "");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvc = services.find(s => s.id === serviceId);`;

const newBookingModalDef = `  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [profId, setProfId] = useState(professionals[0]?.id || "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([services[0]?.id || ""]);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvcs = selectedServiceIds.map((id: string) => services.find((s: any) => s.id === id)).filter(Boolean);
  const totalDuration = selectedSvcs.reduce((acc: number, s: any) => acc + s.duration, 0);
  const totalPrice = selectedSvcs.reduce((acc: number, s: any) => acc + s.price, 0);
  const serviceNames = selectedSvcs.map((s: any) => s.name).join(" + ");`;

uiContent = uiContent.replace(oldBookingModalDef, newBookingModalDef);


const oldSubmit = `save({
          id: "app-" + Date.now(),
          time: timeStr,
          end: new Date(new Date(\`2000-01-01T\${timeStr}:00\`).getTime() + selectedSvc.duration * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          client: selectedClient?.name || "",
          phone: selectedClient?.phone || "",
          service: selectedSvc.name,
          professional: selectedProf?.name || "",
          status: "Aguardando sinal",
          price: selectedSvc.price,
          source: "Interno"
        }, {
          clientId,
          professionalId: profId,
          serviceId: selectedSvc.id,
          dateStr,
          timeStr,
          durationMinutes: selectedSvc.duration,
          price: selectedSvc.price
        });`;

const newSubmit = `save({
          id: "app-" + Date.now(),
          time: timeStr,
          end: new Date(new Date(\`2000-01-01T\${timeStr}:00\`).getTime() + totalDuration * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          client: selectedClient?.name || "",
          phone: selectedClient?.phone || "",
          service: serviceNames,
          professional: selectedProf?.name || "",
          status: "Aguardando sinal",
          price: totalPrice,
          source: "Interno"
        }, {
          clientId,
          professionalId: profId,
          services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),
          dateStr,
          timeStr,
          durationMinutes: totalDuration,
          price: totalPrice
        });`;

uiContent = uiContent.replace(oldSubmit, newSubmit);

const oldLabel = `<label className="sm:col-span-2"><span className="field-label">Serviço</span><select value={serviceId} onChange={e => setServiceId(e.target.value)} className="field-input" required>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}</select></label>`;
const newLabel = `<div className="sm:col-span-2 space-y-2"><span className="field-label">Serviços</span>
            {selectedServiceIds.map((srvId: string, index: number) => (
              <div key={index} className="flex gap-2">
                <select value={srvId} onChange={e => {
                  const newIds = [...selectedServiceIds];
                  newIds[index] = e.target.value;
                  setSelectedServiceIds(newIds);
                }} className="field-input flex-1" required>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}
                </select>
                {selectedServiceIds.length > 1 && (
                  <button type="button" onClick={() => setSelectedServiceIds(selectedServiceIds.filter((_, i) => i !== index))} className="btn-outline !px-3 !min-h-0"><X size={16}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setSelectedServiceIds([...selectedServiceIds, services[0]?.id])} className="text-sm font-medium text-primary hover:underline">+ Adicionar outro serviço</button>
          </div>`;

uiContent = uiContent.replace(oldLabel, newLabel);

fs.writeFileSync(uiPath, uiContent);
