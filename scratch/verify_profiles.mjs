import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
  if (!users?.users?.length) {
    console.log("No users found", err1);
    return;
  }
  
  for (const user of users.users) {
    const { data: profile } = await supabase.from('profiles').select('id, organization_id').eq('id', user.id).single();
    console.log('User:', user.email, 'Auth UID:', user.id, 'Org ID:', profile?.organization_id);
  }
}
check().catch(console.error);
