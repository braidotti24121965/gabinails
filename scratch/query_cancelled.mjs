import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: appts, error } = await supabase.from('appointments').select('id, client_id, status').eq('status', 'cancelled');
  console.log('Cancelled appointments:', appts?.length || 0);
  
  if (appts?.length > 0) {
    const clientIds = [...new Set(appts.map(a => a.client_id))];
    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
    console.log('Clients associated:', clients.map(c => c.name));
  }
}
check();
