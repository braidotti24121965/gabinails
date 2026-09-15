const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
  if (err1) { console.error("Auth err:", err1); return; }
  
  if (!users?.users?.length) { console.log("No users."); return; }
  
  for (const user of users.users) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    
    if (!profile) {
      console.log("Inserting profile for", user.email);
      await supabase.from('profiles').insert({
        id: user.id,
        organization_id: '11111111-1111-4111-8111-111111111111',
        full_name: user.email?.split('@')[0] || 'Admin',
        role: 'owner'
      });
    } else if (profile.organization_id !== '11111111-1111-4111-8111-111111111111') {
      console.log("Updating profile for", user.email);
      await supabase.from('profiles').update({
        organization_id: '11111111-1111-4111-8111-111111111111'
      }).eq('id', user.id);
    } else {
      console.log("Profile already correct for", user.email);
    }
  }
  
  console.log("Done.");
}

run();
