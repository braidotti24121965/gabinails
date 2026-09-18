const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

code = code.replace(
  `  let commissionValue = appointment.items?.reduce((acc: number, it: any) => acc + Number(it.commission_value || 0), 0) || 0;
  if (commissionValue === 0) commissionValue = data.amount * 0.3; // Fallback to 30%

  await supabase
    .from('commissions')
    .insert([{
      organization_id: profile.organization_id,
      appointment_id: data.appointmentId,
      professional_id: appointment.professional_id,
      amount: commissionValue,
      status: 'pending'
    }]);`,
  `  // Insert commissions per item
  if (appointment.items && appointment.items.length > 0) {
    const commissionsToInsert = appointment.items.map((item: any) => {
      let val = Number(item.commission_value || 0);
      if (val === 0 && item.unit_price) {
        val = Number(item.unit_price) * 0.3; // 30% default
      } else if (val === 0) {
        val = (data.amount / appointment.items.length) * 0.3;
      }
      return {
        organization_id: profile.organization_id,
        appointment_item_id: item.id,
        professional_id: item.professional_id || appointment.professional_id,
        amount: val,
        status: 'generated'
      };
    });
    
    const { error: commErr } = await supabase.from('commissions').insert(commissionsToInsert);
    if (commErr) console.error("Error creating commissions:", commErr);
  }`
);

fs.writeFileSync('src/lib/actions/attendance.ts', code);
