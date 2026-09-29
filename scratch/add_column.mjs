import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function run() {
  const res = await supabase.rpc('execute_sql', { query: "ALTER TABLE clients ADD COLUMN IF NOT EXISTS anamnesis JSONB DEFAULT '{}'::jsonb;" });
  console.log(res);
}
run()
