import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key] = val.join('=');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const appId = 'ec20fb0f-5f41-40e0-aca1-04706ca117f3';
  
  // Find the items
  const { data: items } = await supabase.from('appointment_items').select('id').eq('appointment_id', appId);
  if (items?.length) {
    for (const item of items) {
      await supabase.from('commissions').delete().eq('appointment_item_id', item.id);
    }
  }
  
  const { error } = await supabase.from('appointments').delete().eq('id', appId);
  if (error) {
    console.error('Still failed:', error);
  } else {
    console.log('Successfully deleted the final appointment.');
  }
}
run();
