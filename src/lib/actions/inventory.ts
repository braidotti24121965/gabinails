"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getInventory() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return [];

  const nowISO = new Date().toISOString();

  // Fetch products, movements, and future demand inputs in parallel
  const [
    { data: products, error: pErr },
    { data: movements },
    { data: futureAppts }
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("active", true),
    supabase
      .from("stock_movements")
      .select("product_id, movement_type, quantity")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("appointments")
      .select("id, status, starts_at, items:appointment_items(service_id)")
      .in("status", ["pending", "awaiting_deposit", "scheduled", "confirmed"])
      .gte("starts_at", nowISO)
  ]);

  if (pErr || !products) return [];

  // Coleta os service_ids de todos os agendamentos futuros
  const futureServiceIds: string[] = [];
  futureAppts?.forEach((a: any) => {
    a.items?.forEach((i: any) => {
      if (i.service_id) futureServiceIds.push(i.service_id);
    });
  });

  // Busca insumos vinculados aos serviços dos agendamentos futuros
  let consumables: any[] = [];
  if (futureServiceIds.length > 0) {
    const { data: consData } = await supabase
      .from("service_consumables")
      .select("product_id, estimated_quantity, service_id")
      .in("service_id", futureServiceIds);
    consumables = consData || [];
  }

  // Calcula o saldo atual e a demanda futura (forecast) de cada produto
  const inventory = products.map((p: any) => {
    let stock = 0;
    const prodMovements = movements?.filter((m: any) => m.product_id === p.id) || [];
    
    prodMovements.forEach((m: any) => {
      const q = Number(m.quantity);
      if (['purchase', 'positive_adjustment', 'return'].includes(m.movement_type)) {
        stock += q;
      } else if (['consumption', 'loss', 'negative_adjustment'].includes(m.movement_type)) {
        stock -= q;
      }
    });

    let forecast = 0;
    const prodConsumables = consumables.filter((c: any) => c.product_id === p.id);
    prodConsumables.forEach((c: any) => {
      const occurrences = futureServiceIds.filter(sId => sId === c.service_id).length;
      forecast += Number(c.estimated_quantity) * occurrences;
    });

    return {
      id: p.id,
      product: p.name,
      unit: p.base_unit,
      stock,
      minimum: Number(p.minimum_stock),
      ideal: Number(p.ideal_stock),
      cost: Number(p.unit_cost),
      forecast
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
  if (!supabase) return { success: false, error: "Sem conexão com o banco de dados." };

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Organização não encontrada." };

  const name = data.name.trim();
  if (!name || !data.unit || !Number.isFinite(data.minimum) || !Number.isFinite(data.ideal) || !Number.isFinite(data.cost) || data.minimum < 0 || data.ideal < 0 || data.cost < 0 || (data.stock !== undefined && (!Number.isFinite(data.stock) || data.stock < 0))) {
    return { success: false, error: "Preencha os dados do produto com valores válidos." };
  }

  const { data: product, error } = await supabase.from("products").insert([{
    organization_id: profile.organization_id,
    name,
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
    const { error: stockError } = await supabase.from("stock_movements").insert([{
      organization_id: profile.organization_id,
      product_id: product.id,
      movement_type: "positive_adjustment",
      quantity: data.stock,
      source: "initial_stock"
    }]);
    if (stockError) return { success: false, error: `Produto cadastrado, mas o saldo inicial não foi lançado: ${stockError.message}` };
  }
  
  revalidatePath("/");
  return { success: true };
}

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
