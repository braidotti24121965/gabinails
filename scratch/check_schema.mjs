import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols, error } = await supabase.rpc('exec_sql', { sql: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('clients', 'appointments');" }).catch(()=>({}));
  console.log("Since exec_sql doesn't exist, we will fetch one row from each table to inspect fields.");
  
  const { data: clients } = await supabase.from('clients').select('*').limit(1);
  console.log('Clients schema:', clients?.[0] ? Object.keys(clients[0]) : 'no data');
  
  const { data: appointments } = await supabase.from('appointments').select('*').limit(1);
  console.log('Appointments schema:', appointments?.[0] ? Object.keys(appointments[0]) : 'no data');
}
check();
