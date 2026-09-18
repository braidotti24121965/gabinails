import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no db" });

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  
  // Find completed appointments that don't have commissions
  const { data: appts } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      items:appointment_items(id, professional_id, unit_price, commission_value)
    `)
    .eq('status', 'completed');
    
  if (!appts) return NextResponse.json({ error: "no appts" });
  
  let inserted = 0;

  for (const appt of appts) {
    if (!appt.items) continue;
    
    for (const item of appt.items) {
      // Check if commission exists
      const { data: existing } = await supabase.from('commissions').select('id').eq('appointment_item_id', item.id).single();
      if (!existing) {
        // Insert
        let val = Number(item.commission_value || 0);
        if (val === 0 && item.unit_price) val = Number(item.unit_price) * 0.3;
        
        await supabase.from('commissions').insert([{
          organization_id: profile?.organization_id,
          appointment_item_id: item.id,
          professional_id: item.professional_id,
          amount: val,
          status: 'generated'
        }]);
        inserted++;
      }
    }
  }

  return NextResponse.json({ success: true, inserted });
}
