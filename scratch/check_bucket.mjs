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
  const { data: bucket } = await supabase.storage.getBucket('client-photos');
  console.log('Bucket public:', bucket.public);
  console.log('Bucket file_size_limit:', bucket.file_size_limit);
  console.log('Bucket allowed_mime_types:', bucket.allowed_mime_types);

  const { data: clients } = await supabase.from('clients').select('id, name, phone');
  const target = clients.find(c => c.name.includes('Fernando Braidotti'));
  console.log('Client found:', !!target, target ? target.id : '');
}
check().catch(console.error);
