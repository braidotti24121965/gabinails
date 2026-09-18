const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

// Update select to include service_id
code = code.replace(
  'items:appointment_items(\n        id,\n        professional_id,\n        unit_price,\n        commission_value\n      )',
  'items:appointment_items(\n        id,\n        service_id,\n        professional_id,\n        unit_price,\n        commission_value\n      )'
);

// Add inventory deduction logic
const newLogic = `
  // 5. Deduct Inventory (from service_consumables)
  if (appointment.items && appointment.items.length > 0) {
    const serviceIds = appointment.items.map((i: any) => i.service_id).filter(Boolean);
    if (serviceIds.length > 0) {
      // Find all consumables for these services
      const { data: consumables } = await supabase
        .from('service_consumables')
        .select('product_id, estimated_quantity, service_id')
        .in('service_id', serviceIds);

      if (consumables && consumables.length > 0) {
        const movementsToInsert: any[] = [];
        
        // We iterate over the items actually performed in this appointment
        for (const item of appointment.items) {
          if (!item.service_id) continue;
          
          // Get consumables for this specific service
          const serviceConsumables = consumables.filter(c => c.service_id === item.service_id);
          
          for (const cons of serviceConsumables) {
            movementsToInsert.push({
              organization_id: profile.organization_id,
              product_id: cons.product_id,
              movement_type: 'consumption',
              quantity: cons.estimated_quantity,
              appointment_item_id: item.id,
              source: 'appointment_conclusion'
            });
          }
        }

        if (movementsToInsert.length > 0) {
          const { error: invErr } = await supabase.from('stock_movements').insert(movementsToInsert);
          if (invErr) console.error("Error deducting inventory:", invErr);
        }
      }
    }
  }

  revalidatePath("/");
`;

code = code.replace('revalidatePath("/");', newLogic);
fs.writeFileSync('src/lib/actions/attendance.ts', code);
