import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('test_foldername_x', {}).catch(() => ({}));
  
  // Actually, we can just insert a row into a dummy table and use a trigger, or use a REST API query.
  // Wait, I can just use supabase.from('clients').select('id').eq('id', '...'); 
  // Let's create a temporary RPC to test storage.foldername
}
check().catch(console.error);
