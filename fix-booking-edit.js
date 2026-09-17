const fs = require('fs');

// 1. Backend Action: Add updateAppointmentRecord
const actionPath = 'src/lib/actions/appointments.ts';
let actionContent = fs.readFileSync(actionPath, 'utf8');

const updateFunction = `
export async function updateAppointmentRecord(appointmentId: string, data: {
  clientId: string;
  professionalId: string;
  services: { id: string; price: number; durationMinutes: number }[];
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
  price: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };
  
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const startsAt = new Date(\`\${data.dateStr}T\${data.timeStr}:00\`).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + data.durationMinutes * 60000).toISOString();

  // Update appointment
  const { error: appError } = await supabase
    .from("appointments")
    .update({
      client_id: data.clientId,
      professional_id: data.professionalId,
      starts_at: startsAt,
      ends_at: endsAt
    })
    .eq("id", appointmentId);

  if (appError) {
    if (appError.message?.includes("appointments_no_overlap")) {
      return { success: false, error: "Este horário já está ocupado para esta profissional." };
    }
    return { success: false, error: appError.message };
  }

  // Replace items
  await supabase.from("appointment_items").delete().eq("appointment_id", appointmentId);
  
  const itemsToInsert = data.services.map(s => ({
    organization_id: profile.organization_id!,
    appointment_id: appointmentId,
    service_id: s.id,
    professional_id: data.professionalId,
    description: "Agendamento (Editado)",
    duration_minutes: s.durationMinutes,
    unit_price: s.price,
    commission_type: "percentage",
    commission_value: 0
  }));

  await supabase.from("appointment_items").insert(itemsToInsert);

  revalidatePath("/");
  return { success: true };
}
`;
if (!actionContent.includes('export async function updateAppointmentRecord')) {
  actionContent += updateFunction;
  fs.writeFileSync(actionPath, actionContent);
}

// 2. Update UI: nail-studio-app.tsx
const uiPath = 'src/components/nail-studio-app.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Instead of rewriting BookingModal entirely, let's just create AppointmentModal and replace EntityModal usage
const appointmentModalCode = `
function AppointmentModal({ mode, appointment, clients, professionals, services, close, save }: { mode: "view" | "edit"; appointment: any; clients: any[]; professionals: any[]; services: any[]; close: () => void; save: (id: string, rawData: any) => void }) {
  const [clientId, setClientId] = useState(appointment?.client_id || clients.find(c => c.name === appointment?.client)?.id || clients[0]?.id || "");
  const [profId, setProfId] = useState(appointment?.professional_id || professionals.find(p => p.name === appointment?.professional)?.id || professionals[0]?.id || "");
  
  // Try to parse services from the joined string or fallback to empty array (not perfect, but works for MVP since we don't have the full raw item easily available without refetching)
  const initialServiceNames = appointment?.service ? appointment.service.split(" + ") : [];
  const initialServiceIds = initialServiceNames.map(name => services.find(s => s.name === name)?.id).filter(Boolean);
  
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialServiceIds.length > 0 ? initialServiceIds : [services[0]?.id || ""]);
  
  // Date parsing
  // the 'time' is just HH:MM, date is not stored in demo Appointment struct cleanly, we'll just use today if unknown.
  // Actually, we need to extract date from the real db starts_at if we had it. For now, use today.
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState(appointment?.time || "09:00");
  const [submitting, setSubmitting] = useState(false);
  const readOnly = mode === "view";

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvcs = selectedServiceIds.map((id: string) => services.find((s: any) => s.id === id)).filter(Boolean);
  const totalDuration = selectedSvcs.reduce((acc: number, s: any) => acc + s.duration, 0);
  const totalPrice = selectedSvcs.reduce((acc: number, s: any) => acc + s.price, 0);

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 p-0 sm:items-center sm:p-4"><form onSubmit={async e => {
    e.preventDefault();
    if (!selectedClient || !selectedProf || selectedSvcs.length === 0) return;
    setSubmitting(true);
    await save(appointment.id, {
      clientId,
      professionalId: profId,
      services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),
      dateStr,
      timeStr,
      durationMinutes: totalDuration,
      price: totalPrice
    });
  }} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><Badge tone="primary">{mode === "view" ? "Detalhes" : "Editar Agendamento"}</Badge><h2 className="mt-2 text-lg font-semibold">{appointment?.client || "Agendamento"}</h2></div><button type="button" onClick={close} className="rounded-md p-2 text-muted hover:bg-bg"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label><span className="field-label">Cliente</span><select disabled={readOnly} value={clientId} onChange={e => setClientId(e.target.value)} className="field-input" required>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label><span className="field-label">Profissional</span><select disabled={readOnly} value={profId} onChange={e => setProfId(e.target.value)} className="field-input" required>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="sm:col-span-2 space-y-2"><span className="field-label">Serviços</span>
            {selectedServiceIds.map((srvId: string, index: number) => (
              <div key={index} className="flex gap-2">
                <select disabled={readOnly} value={srvId} onChange={e => {
                  const newIds = [...selectedServiceIds];
                  newIds[index] = e.target.value;
                  setSelectedServiceIds(newIds);
                }} className="field-input flex-1" required>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}
                </select>
                {selectedServiceIds.length > 1 && !readOnly && (
                  <button type="button" onClick={() => setSelectedServiceIds(selectedServiceIds.filter((_, i) => i !== index))} className="btn-outline !px-3 !min-h-0"><X size={16}/></button>
                )}
              </div>
            ))}
            {!readOnly && <button type="button" onClick={() => setSelectedServiceIds([...selectedServiceIds, services[0]?.id])} className="text-sm font-medium text-primary hover:underline">+ Adicionar outro serviço</button>}
          </div>
    <label><span className="field-label">Data</span><input disabled={readOnly} className="field-input" type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} required /></label>
    <label><span className="field-label">Horário</span><input disabled={readOnly} className="field-input" type="time" step="900" value={timeStr} onChange={e=>setTimeStr(e.target.value)} required /></label>
  </div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={close} className="btn-outline">{readOnly ? "Fechar" : "Cancelar"}</button>{!readOnly && <button disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Salvar alterações"}</button>}</div></form></div> }
`;
if (!uiContent.includes('function AppointmentModal')) {
  uiContent = uiContent.replace('function EntityModal', appointmentModalCode + '\nfunction EntityModal');
}

// Ensure updateAppointmentRecord is imported if it's new
if (!uiContent.includes('updateAppointmentRecord')) {
  uiContent = uiContent.replace(
    'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus } from "@/lib/actions/appointments";',
    'import { getAppointments, createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, updateAppointmentRecord } from "@/lib/actions/appointments";'
  );
}

// 3. Swap the render block in nail-studio-app.tsx to use AppointmentModal instead of EntityModal for appointments
const renderModalOld = `        entityModal.kind === "service" ? (
          <ServiceModal
            mode={entityModal.mode}
            service={entityModal.index !== undefined ? serviceRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveService}
          />
        ) : entityModal.kind === "professional" ? (
          <ProfessionalModal
            mode={entityModal.mode}
            professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveProfessional}
          />
        ) : (
          <EntityModal key={\`\${entityModal.kind}-\${entityModal.mode}-\${entityModal.index ?? "new"}\`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />
        )`;

const renderModalNew = `        entityModal.kind === "appointment" ? (
          <AppointmentModal
            mode={entityModal.mode as any}
            appointment={entityModal.fullItem}
            clients={clientRows}
            professionals={professionalRows}
            services={serviceRows}
            close={() => setEntityModal(null)}
            save={async (id, rawData) => {
              const res = await updateAppointmentRecord(id, rawData);
              if (res.success) {
                // Optimistic UI update
                setRows(current => current.map(r => r.id === id ? { ...r, time: rawData.timeStr, professional: professionalRows.find(p => p.id === rawData.professionalId)?.name || "", service: rawData.services.map((s:any)=>serviceRows.find((sr:any)=>sr.id===s.id)?.name).join(" + "), price: rawData.price } : r));
                setEntityModal(null);
                notify("Agendamento atualizado!");
              } else {
                alert(res.error);
              }
            }}
          />
        ) : entityModal.kind === "service" ? (
          <ServiceModal
            mode={entityModal.mode}
            service={entityModal.index !== undefined ? serviceRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveService}
          />
        ) : entityModal.kind === "professional" ? (
          <ProfessionalModal
            mode={entityModal.mode}
            professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveProfessional}
          />
        ) : (
          <EntityModal key={\`\${entityModal.kind}-\${entityModal.mode}-\${entityModal.index ?? "new"}\`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />
        )`;

uiContent = uiContent.replace(renderModalOld, renderModalNew);

// Remove the old if (kind === "appointment" && state.fullItem) from EntityModal
const entityModalAppointmentIf = `  if (state.kind === "appointment" && state.fullItem) {
    return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{state.mode === "view" ? "Detalhes do Agendamento" : "Edição Restrita"}</Badge><h2 className="mt-2 text-xl font-bold">{state.fullItem.client}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="field-label">Profissional</label><input className="field-input" value={state.fullItem.professional} disabled /></div><div><label className="field-label">Status</label><input className="field-input" value={state.fullItem.status} disabled /></div><div><label className="field-label">Horário</label><input className="field-input" value={state.fullItem.time + " às " + (state.fullItem.end === "Invalid Date" ? "..." : state.fullItem.end || "...")} disabled /></div><div><label className="field-label">Valor</label><input className="field-input" value={money.format(state.fullItem.price)} disabled /></div><div className="col-span-2"><label className="field-label">Serviços agendados</label><textarea className="field-input min-h-[60px]" value={state.fullItem.service.split(" + ").join("\\n")} disabled /></div></div><div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-medium mb-1">Modo de Visualização</p>Para alterar o horário, profissional ou serviço, você precisa cancelar este agendamento (lixeira) e criar um novo. A funcionalidade de remarcação e edição completa será implementada no próximo ciclo.</div></div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Fechar</button></div></div></div>;
  }`;

uiContent = uiContent.replace(entityModalAppointmentIf, '');

fs.writeFileSync(uiPath, uiContent);
