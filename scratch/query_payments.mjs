import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const clientId = '7562bc9c-2477-47a2-81c7-eed052900961';
  
  // Find payments by client_id? Wait, payments table might not have client_id directly.
  // Let's check payments table schema.
  const { data: p } = await supabase.from('payments').select('*').limit(1);
  console.log('Payments schema:', p?.[0] ? Object.keys(p[0]) : 'no data');
  
  // Also we can query all payments
  const { data: allP } = await supabase.from('payments').select('*');
  console.log('All payments:', allP);
}
run();
