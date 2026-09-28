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
  const { data, error } = await supabase.rpc('get_current_org', {}).catch(() => ({}));
  // We can't RPC current_organization_id because it's in private schema.
  
  // Let's create a test function to evaluate storage.foldername('org/client/file.jpg')
  const { error: err1 } = await supabase.rpc('exec_sql', { sql: "CREATE OR REPLACE FUNCTION public.test_foldername() RETURNS text[] AS $$ SELECT storage.foldername('a/b/c.jpg') $$ LANGUAGE sql;" });
  
  // If we can't create functions... let's just use REST.
}
check().catch(console.error);
