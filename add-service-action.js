const fs = require('fs');
const path = 'src/lib/actions/appointments.ts';
let content = fs.readFileSync(path, 'utf8');

const newAction = `
export async function addServiceToAppointment(appointmentId: string, professionalId: string, serviceId: string, price: number, durationMinutes: number) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };
  
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  const { error } = await supabase.from("appointment_items").insert([{
    organization_id: profile.organization_id,
    appointment_id: appointmentId,
    service_id: serviceId,
    professional_id: professionalId,
    description: "Adicional",
    duration_minutes: durationMinutes,
    unit_price: price,
    commission_type: "percentage",
    commission_value: 0
  }]);

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}
`;

if (!content.includes('addServiceToAppointment')) {
  content += newAction;
  fs.writeFileSync(path, content);
}
