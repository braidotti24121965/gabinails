const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/inventory.ts', 'utf8');

code = code.replace(
  'export async function createProduct(data: { name: string; unit: string; minimum: number; ideal: number; cost: number }) {',
  'export async function createProduct(data: { name: string; unit: string; minimum: number; ideal: number; cost: number; stock?: number }) {'
);

code = code.replace(
  'unit_cost: data.cost,\n    category: "Geral"\n  }]);',
  'unit_cost: data.cost,\n    category: "Geral"\n  }]).select("id").single();'
);

code = code.replace(
  'if (error) {\n    console.error("Create product error", error);\n    return { success: false, error: error.message };\n  }\n  \n  revalidatePath("/");',
  `if (error) {
    console.error("Create product error", error);
    return { success: false, error: error.message };
  }
  
  if (data.stock && data.stock > 0) {
    await supabase.from("stock_movements").insert([{
      organization_id: profile.organization_id,
      product_id: arguments[0].data?.id,
      movement_type: "positive_adjustment",
      quantity: data.stock,
      source: "initial_stock"
    }]);
  }
  
  revalidatePath("/");`
);

// fix the arguments[0].data?.id issue
code = code.replace('arguments[0].data?.id', '((await supabase.from("products").select("id").eq("organization_id", profile.organization_id).eq("name", data.name).single()).data?.id)');

fs.writeFileSync('src/lib/actions/inventory.ts', code);
