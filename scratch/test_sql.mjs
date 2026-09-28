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
  const { data, error } = await supabase.rpc('query', { sql: "SELECT storage.foldername('org/client/file.jpg')" });
  // Wait, RPC won't work unless there's a custom function.
  // We can insert a row into a temp table if we want, or just select from a view.
}
check().catch(console.error);
