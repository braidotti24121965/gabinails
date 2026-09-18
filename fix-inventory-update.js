const fs = require('fs');

// 1. Add updateProduct to inventory.ts
let inv = fs.readFileSync('src/lib/actions/inventory.ts', 'utf8');
if (!inv.includes('export async function updateProduct')) {
  inv += `
export async function updateProduct(id: string, data: { name: string; unit: string; minimum: number; ideal: number; cost: number; stock?: number; currentStock?: number }) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from("products").update({
    name: data.name,
    base_unit: data.unit,
    minimum_stock: data.minimum,
    ideal_stock: data.ideal,
    unit_cost: data.cost
  }).eq("id", id);

  if (error) return { success: false, error: error.message };
  
  if (data.stock !== undefined && data.currentStock !== undefined && data.stock !== data.currentStock) {
    const diff = data.stock - data.currentStock;
    await supabase.from("stock_movements").insert([{
      organization_id: (await supabase.from('profiles').select('organization_id').single()).data?.organization_id,
      product_id: id,
      movement_type: diff > 0 ? "positive_adjustment" : "negative_adjustment",
      quantity: Math.abs(diff),
      source: "manual_adjustment"
    }]);
  }
  
  revalidatePath("/");
  return { success: true };
}
`;
  fs.writeFileSync('src/lib/actions/inventory.ts', inv);
}

// 2. Fix ProductModal in nail-studio-app.tsx to accept initial values
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'import { createProduct } from "@/lib/actions/inventory";',
  'import { createProduct, updateProduct, addStockMovement } from "@/lib/actions/inventory";'
);

code = code.replace(
  'function ProductModal({ close, save }: { close: () => void; save: (data: any) => Promise<void> }) {',
  'function ProductModal({ product, close, save }: { product?: any; close: () => void; save: (data: any) => Promise<void> }) {'
);

code = code.replace(
  'const [name, setName] = useState("");',
  'const [name, setName] = useState(product?.product || "");'
);
code = code.replace(
  'const [unit, setUnit] = useState("unit");',
  'const [unit, setUnit] = useState(product?.unit || "unit");'
);
code = code.replace(
  'const [min, setMin] = useState("");',
  'const [min, setMin] = useState(product?.minimum ?? "");'
);
code = code.replace(
  'const [ideal, setIdeal] = useState("");',
  'const [ideal, setIdeal] = useState(product?.ideal ?? "");'
);
code = code.replace(
  'const [cost, setCost] = useState("");',
  'const [cost, setCost] = useState(product?.cost ?? "");'
);
code = code.replace(
  'const [stock, setStock] = useState(""); // Initial stock',
  'const [stock, setStock] = useState(product?.stock ?? ""); // Initial stock'
);

code = code.replace(
  '{entityModal && entityModal.kind === "product" && entityModal.mode === "create" && (',
  '{entityModal && entityModal.kind === "product" && ('
);

code = code.replace(
  '<ProductModal \n          close={() => setEntityModal(null)} \n          save={async (data) => {\n            const res = await createProduct(data);\n            if (res.success) {\n              window.location.reload();\n            } else {\n              alert("Erro ao criar produto: " + res.error);\n            }\n          }} \n        />',
  `<ProductModal 
          product={entityModal.mode !== "create" && entityModal.index !== undefined ? productRows[entityModal.index] : undefined}
          close={() => setEntityModal(null)} 
          save={async (data) => {
            let res;
            if (entityModal.mode === "create") {
              res = await createProduct(data);
            } else {
              const p = productRows[entityModal.index!];
              res = await updateProduct(p.id, { ...data, currentStock: p.stock });
            }
            if (res.success) {
              window.location.reload();
            } else {
              alert("Erro ao salvar produto: " + res.error);
            }
          }} 
        />`
);

// Remove the hardcoded onDelete alert
code = code.replace(
  'if (view === "inventory") return <Inventory data={productRows} onNew={() => openEntity("product", "create")} onAction={(mode, index) => openEntity("product", mode, index)} onDelete={() => notify("Ajuste manual indisponível na demonstração.")} />;',
  'if (view === "inventory") return <Inventory data={productRows} onNew={() => openEntity("product", "create")} onAction={(mode, index) => openEntity("product", mode, index)} onDelete={(index) => { openEntity("product", "edit", index); notify("Atualize o campo \\"Saldo atual\\" para corrigir o estoque."); }} />;'
);


fs.writeFileSync('src/components/nail-studio-app.tsx', code);
