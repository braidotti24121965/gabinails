import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';" });
  if (error) console.log(error);
  console.log(data);
}
check().catch(console.error);
