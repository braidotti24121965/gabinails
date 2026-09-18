const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      client:clients(name),
      items:appointment_items(
        id,
        service:services(name),
        unit_price
      )
    `);
  console.log(JSON.stringify(data, null, 2));
}
run();
