const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

const regex = /\/\/ 2 & 3\. Handle Atomic Checkout[\s\S]*return \{ success: true \};\n\}/;

const replace = `  // 2. Prepare Commissions
  const commissions: any[] = [];
  if (appointment.items && appointment.items.length > 0) {
    appointment.items.forEach((item: any) => {
      let val = Number(item.commission_value || 0);
      if (val === 0 && item.unit_price) {
        val = Number(item.unit_price) * 0.3; // 30% default
      } else if (val === 0) {
        val = (data.amount / appointment.items.length) * 0.3;
      }
      commissions.push({
        appointment_item_id: item.id,
        professional_id: item.professional_id || appointment.professional_id,
        amount: val
      });
    });
  }

  // 3. Prepare Inventory Deductions
  const inventoryDeductions: any[] = [];
  if (appointment.items && appointment.items.length > 0) {
    const serviceIds = appointment.items.map((i: any) => i.service_id).filter(Boolean);
    if (serviceIds.length > 0) {
      const { data: consumables } = await supabase
        .from('service_consumables')
        .select('product_id, estimated_quantity, service_id')
        .in('service_id', serviceIds);

      if (consumables && consumables.length > 0) {
        for (const item of appointment.items) {
          if (!item.service_id) continue;
          const serviceConsumables = consumables.filter(c => c.service_id === item.service_id);
          for (const cons of serviceConsumables) {
            inventoryDeductions.push({
              product_id: cons.product_id,
              quantity: cons.estimated_quantity
            });
          }
        }
      }
    }
  }

  // 4. Handle Atomic Checkout via new RPC
  const { error: rpcErr } = await supabase.rpc('finish_appointment_checkout_full', {
    p_appointment_id: data.appointmentId,
    p_payment_amount: data.packageId ? 0 : data.amount,
    p_payment_method: data.packageId ? 'other' : data.paymentMethod,
    p_package_id: data.packageId || null,
    p_commissions: commissions,
    p_inventory_deductions: inventoryDeductions
  });

  if (rpcErr) {
    return { success: false, error: "Erro no checkout: " + rpcErr.message };
  }

  revalidatePath("/");

  return { success: true };
}`;

code = code.replace(regex, replace);

fs.writeFileSync('src/lib/actions/attendance.ts', code);
