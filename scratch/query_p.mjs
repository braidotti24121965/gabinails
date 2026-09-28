import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: p } = await supabase.from('payments').select('*');
  console.log('Payments table rows:', p?.length);
  
  // Maybe totalSpent is calculated from appointment cost if payment table is not fully populated?
  // Let's check how totalSpent is calculated for getClientProfile:
}
run();
