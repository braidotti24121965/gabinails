const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

const packageLogic = `
  // Deduct package if used
  if (paymentMethod === "Pacote") {
    const { data: appt } = await supabase.from('appointments').select('client_id').eq('id', appointmentId).single();
    if (appt?.client_id) {
      const { data: client } = await supabase.from('clients').select('notes').eq('id', appt.client_id).single();
      if (client?.notes?.startsWith("{")) {
        try {
          const parsed = JSON.parse(client.notes);
          if (parsed.packages && parsed.packages.length > 0) {
            // Deduct from the first active package
            const activePkg = parsed.packages.find((p: any) => p.used < p.total);
            if (activePkg) {
              activePkg.used += 1;
              await supabase.from('clients').update({ notes: JSON.stringify(parsed) }).eq('id', appt.client_id);
            }
          }
        } catch(e) {}
      }
    }
  }
`;

code = code.replace(
  'const { error: apptError }',
  packageLogic + '\n  const { error: apptError }'
);

fs.writeFileSync('src/lib/actions/attendance.ts', code);
