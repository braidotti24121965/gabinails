const fs = require('fs');

function fixAction(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('organization_id: profile.organization_id')) return; // Already fixed
  
  content = content.replace(
    'const supabase = await createClient();\n  if (!supabase) return { success: false, error: "No connection" };',
    `const supabase = await createClient();\n  if (!supabase) return { success: false, error: "No connection" };\n\n  const { data: profile } = await supabase.from('profiles').select('organization_id').single();\n  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada" };`
  );
  
  if (file.includes('appointments.ts')) {
    content = content.replace(
      'client_id: data.clientId,',
      'organization_id: profile.organization_id,\n      client_id: data.clientId,'
    );
    content = content.replace(
      'appointment_id: appointment.id,',
      'organization_id: profile.organization_id,\n      appointment_id: appointment.id,'
    );
  } else if (file.includes('specialties.ts')) {
    content = content.replace(
      'insert([{ name }])',
      'insert([{ organization_id: profile.organization_id, name }])'
    );
  }
  
  fs.writeFileSync(file, content);
}

fixAction('src/lib/actions/appointments.ts');
fixAction('src/lib/actions/specialties.ts');
