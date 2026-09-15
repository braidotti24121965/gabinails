const fs = require('fs');

// Add update status action
const pathA = 'src/lib/actions/appointments.ts';
let act = fs.readFileSync(pathA, 'utf8');
if (!act.includes('updateAppointmentStatus')) {
  act += `
export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
  revalidatePath("/");
  return { success: true };
}
`;
  fs.writeFileSync(pathA, act);
}

// Update UI
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// import update action
if (!content.includes('updateAppointmentStatus')) {
  content = content.replace(
    'cancelAppointmentRecord } from "@/lib/actions/appointments";',
    'cancelAppointmentRecord, updateAppointmentStatus } from "@/lib/actions/appointments";'
  );
}

// Update Agenda component to receive onStatusChange
content = content.replace(
  'onCancel: (index: number, id: string) => void }) {',
  'onCancel: (index: number, id: string) => void; onStatusChange: (id: string, status: string) => void }) {'
);

// Replace Badge with a Select
content = content.replace(
  '<Badge tone={statusTone(a.status)}>{a.status}</Badge></button><RowActions',
  `<div className="hidden sm:block">
     <select 
       value={a.status}
       onClick={(e) => e.stopPropagation()} 
       onChange={(e) => onStatusChange(a.id, e.target.value)}
       className="field-input !py-1 !text-xs !h-8 w-32"
     >
       <option value="Aguardando sinal">Aguardando sinal</option>
       <option value="Agendado">Agendado</option>
       <option value="Confirmado">Confirmado</option>
       <option value="Cliente chegou">Cliente chegou</option>
       <option value="Em atendimento">Em atendimento</option>
       <option value="Concluído">Concluído</option>
     </select>
   </div></button><RowActions`
);

// Add onStatusChange to NailStudioApp's Agenda invocation
content = content.replace(
  'onCancel={(index, id) => confirmAction("Cancelar este agendamento?',
  `onStatusChange={async (id, statusUI) => {
    const map: Record<string, string> = {
      "Aguardando sinal": "awaiting_deposit",
      "Agendado": "scheduled",
      "Confirmado": "confirmed",
      "Cliente chegou": "arrived",
      "Em atendimento": "in_progress",
      "Concluído": "completed"
    };
    const dbStatus = map[statusUI];
    if (dbStatus) {
      setRows(current => current.map(item => item.id === id ? { ...item, status: statusUI as any } : item));
      await updateAppointmentStatus(id, dbStatus);
    }
  }}
  onCancel={(index, id) => confirmAction("Cancelar este agendamento?`
);

fs.writeFileSync(path, content);
