import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const org = '16a3a497-2a5c-43f1-b952-47525381a179'; 
  const client = '7562bc9c-2477-47a2-81c7-eed052900961'; 
  const name = `${org}/${client}/test.jpg`;

  // Use raw sql to test RLS
  // We can select the evaluation of the expression!
  const sql = `
  SELECT 
    (storage.foldername('${name}'))[1] as folder1,
    (storage.foldername('${name}'))[2] as folder2,
    ((storage.foldername('${name}'))[2]) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' as is_uuid
  `;
  const { data, error } = await supabase.rpc('test_eval_x', {}).catch(()=>({}));
  // Cannot run arbitrary sql without a function.
}
test();
