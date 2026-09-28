import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('test_fn', {});
  console.log(data, error);
}

// We can just use the `psql` equivalent via Supabase DB query if we had it.
// Let's create a temporary view and query it.
async function doTest() {
  await supabase.rpc('exec_sql', { sql: "CREATE OR REPLACE VIEW public.test_view AS SELECT storage.foldername('a/b/c.jpg') AS folder, storage.extension('a/b/c.jpg') AS ext;" });
  const { data, error } = await supabase.from('test_view').select('*');
  console.log('Result:', data, error);
  await supabase.rpc('exec_sql', { sql: "DROP VIEW public.test_view;" });
}
doTest().catch(console.error);
