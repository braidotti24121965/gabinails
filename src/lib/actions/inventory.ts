"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getInventory() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return [];

  // Fetch products
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("active", true);

  if (pErr || !products) return [];

  // Fetch stock movements
  const { data: movements, error: mErr } = await supabase
    .from("stock_movements")
    .select("product_id, movement_type, quantity")
    .eq("organization_id", profile.organization_id);

  if (mErr) console.error("Movements error", mErr);

  // Calculate current stock
  const inventory = products.map((p: any) => {
    let stock = 0;
    const prodMovements = movements?.filter(m => m.product_id === p.id) || [];
    
    prodMovements.forEach(m => {
      const q = Number(m.quantity);
      if (['purchase', 'positive_adjustment', 'return'].includes(m.movement_type)) {
        stock += q;
      } else if (['consumption', 'loss', 'negative_adjustment'].includes(m.movement_type)) {
        stock -= q;
      }
    });

    return {
      id: p.id,
      product: p.name,
      unit: p.base_unit,
      stock,
      minimum: Number(p.minimum_stock),
      ideal: Number(p.ideal_stock),
      cost: Number(p.unit_cost),
      forecast: 0 // Mock for now
    };
  });

  return inventory;
}

export async function addStockMovement(productId: string, type: string, quantity: number, source: string = "manual") {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "No connection" };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Org not found" };

  const { error } = await supabase.from("stock_movements").insert([{
    organization_id: profile.organization_id,
    product_id: productId,
    movement_type: type, // 'purchase', 'consumption', etc
    quantity: Math.abs(quantity),
    source
  }]);

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function createProduct(data: { name: string; unit: string; minimum: number; ideal: number; cost: number; stock?: number }) {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false };

  const { error } = await supabase.from("products").insert([{
    organization_id: profile.organization_id,
    name: data.name,
    base_unit: data.unit, // Using the correct column name from schema
    minimum_stock: data.minimum,
    ideal_stock: data.ideal,
    unit_cost: data.cost,
    category: "Geral"
  }]).select("id").single();

  if (error) {
    console.error("Create product error", error);
    return { success: false, error: error.message };
  }
  
  if (data.stock && data.stock > 0) {
    await supabase.from("stock_movements").insert([{
      organization_id: profile.organization_id,
      product_id: ((await supabase.from("products").select("id").eq("organization_id", profile.organization_id).eq("name", data.name).single()).data?.id),
      movement_type: "positive_adjustment",
      quantity: data.stock,
      source: "initial_stock"
    }]);
  }
  
  revalidatePath("/");
  return { success: true };
}
