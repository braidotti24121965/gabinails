const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/attendance.ts', 'utf8');

const regexConsumables = /const \{ data: consumables \} = await supabase[\s\S]*?if \(consumables && consumables\.length > 0\) \{/;

const replaceConsumables = `const { data: consumables, error: consErr } = await supabase
        .from('service_consumables')
        .select('product_id, estimated_quantity, service_id')
        .in('service_id', serviceIds);

      if (consErr) return { success: false, error: "Erro ao buscar consumíveis." };

      if (consumables && consumables.length > 0) {`;

code = code.replace(regexConsumables, replaceConsumables);

const regexPush = /inventoryDeductions\.push\(\{\n              product_id: cons\.product_id,\n              quantity: cons\.estimated_quantity\n            \}\);/;
const replacePush = `inventoryDeductions.push({
              product_id: cons.product_id,
              quantity: cons.estimated_quantity,
              appointment_item_id: item.id
            });`;

code = code.replace(regexPush, replacePush);

fs.writeFileSync('src/lib/actions/attendance.ts', code);
