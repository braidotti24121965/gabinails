import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: appts, error: fetchErr } = await supabase.from('appointments').select('id').eq('status', 'cancelled');
  if (fetchErr) return console.error('Fetch error:', fetchErr);
  
  let successCount = 0;
  for (const a of appts) {
    // Attempt to delete message jobs first (since they are generated automatically)
    await supabase.from('message_jobs').delete().eq('appointment_id', a.id);
    
    // Attempt to delete payments linked to this appointment
    await supabase.from('payments').delete().eq('appointment_id', a.id);
    
    // Unlink photos (just in case they want to keep the photo on the client)
    await supabase.from('client_photos').update({ appointment_id: null }).eq('appointment_id', a.id);
    
    const { error: delErr } = await supabase.from('appointments').delete().eq('id', a.id);
    if (delErr) {
      console.error(`Error deleting appointment ${a.id}:`, delErr);
    } else {
      successCount++;
    }
  }
  console.log(`Successfully deleted ${successCount} cancelled appointments.`);
}
run();
