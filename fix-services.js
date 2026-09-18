const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/services.ts', 'utf8');

// Update ServiceItem to include consumables
code = code.replace(
  'active: boolean;\n}',
  'active: boolean;\n  consumables?: { product_id: string; estimated_quantity: number }[];\n}'
);

// Update getServices to fetch consumables
code = code.replace(
  '.order("name", { ascending: true });',
  '.order("name", { ascending: true });\n\n  const { data: consumables } = await supabase.from("service_consumables").select("*");'
);

code = code.replace(
  'active: item.active\n  }));',
  'active: item.active,\n    consumables: consumables?.filter(c => c.service_id === item.id).map(c => ({ product_id: c.product_id, estimated_quantity: c.estimated_quantity })) || []\n  }));'
);

// Add linkConsumableToService action
const newAction = `
export async function updateServiceConsumables(serviceId: string, consumables: { product_id: string; quantity: number }[]) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  // First delete existing consumables for this service
  await supabase.from("service_consumables").delete().eq("service_id", serviceId);

  // Then insert the new ones
  if (consumables.length > 0) {
    const toInsert = consumables.map(c => ({
      organization_id: profile.organization_id,
      service_id: serviceId,
      product_id: c.product_id,
      estimated_quantity: c.quantity
    }));
    await supabase.from("service_consumables").insert(toInsert);
  }

  revalidatePath("/");
  return { success: true };
}
`;

code += newAction;

fs.writeFileSync('src/lib/actions/services.ts', code);
