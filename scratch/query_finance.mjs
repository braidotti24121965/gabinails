import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: p } = await supabase.from('payments').select('id');
  const { data: e } = await supabase.from('expenses').select('id');
  const { data: c } = await supabase.from('commissions').select('id');
  
  console.log(`Payments: ${p?.length}, Expenses: ${e?.length}, Commissions: ${c?.length}`);
  
  // also what about appointment_items?
  const { data: i } = await supabase.from('appointment_items').select('id');
  console.log(`Items: ${i?.length}`);
}
run();
