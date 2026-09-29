export async function markMessageSentService(supabase: any, clientId: string, list: string, appointmentId?: string) {
  if (!supabase) return { success: false, error: "Sem banco de dados" };
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };

  let query = supabase
    .from('message_jobs')
    .select('id, payload')
    .eq('organization_id', profile.organization_id)
    .eq('client_id', clientId)
    .eq('status', 'sent');

  if (appointmentId) {
    query = query.eq('appointment_id', appointmentId);
  }

  const { data: existingJobs } = await query;
  const alreadySent = Array.isArray(existingJobs) && existingJobs.some((j: any) => j.payload?.list === list);

  if (alreadySent) {
    return { success: true, duplicate: true };
  }

  const { error } = await supabase.from('message_jobs').insert([{
    organization_id: profile.organization_id,
    client_id: clientId,
    appointment_id: appointmentId || null,
    channel: 'whatsapp',
    provider: 'manual',
    status: 'sent',
    scheduled_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    payload: { list, type: list === 'reminders' ? 'reminder' : 'overdue' }
  }]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
