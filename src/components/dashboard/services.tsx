import React from "react";
import { Plus } from "lucide-react";
import { Badge, RowActions } from "../shared";
import { money } from "@/lib/demo-data";

export function Services({
  data,
  inventory,
  onNew,
  onAction,
  onDelete,
  onConsumables
}: {
  data: any[];
  inventory: any[];
  onNew: () => void;
  onAction: (mode: "view" | "edit", index: number) => void;
  onDelete: (index: number) => void;
  onConsumables: (index: number) => void;
}) {
  return (
    <main className="page-content">
      <div className="mb-5 flex justify-end">
        <button onClick={onNew} className="btn-primary">
          <Plus size={16} />
          Novo serviço
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((s, index) => {
          const consumablesCount = s.consumables?.length || 0;
          let tooltipText = "Nenhum insumo configurado";
          
          if (consumablesCount > 0 && inventory) {
            tooltipText = s.consumables.map((c: any) => {
              const prod = inventory.find((p: any) => p.id === c.product_id);
              return `${prod ? prod.product : 'Produto desconhecido'}: ${c.estimated_quantity} ${prod ? prod.unit : ''}`;
            }).join('\n');
          }

          return (
            <div className="card transition hover:border-primary/40 flex flex-col" key={s.id || s.name}>
              <button onClick={() => onAction("view", index)} className="w-full text-left flex-1">
                <div className="flex justify-between">
                  <Badge tone="primary">{s.category}</Badge>
                  <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{s.name}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E7EDF3] pt-4">
                  <div>
                    <p className="text-[10px] text-muted">Duração</p>
                    <p className="mt-1 text-xs font-medium">{s.duration} min</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Preço</p>
                    <p className="mt-1 text-xs font-medium">{money.format(s.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Manutenção</p>
                    <p className="mt-1 text-xs font-medium">{s.maintenance ? `${s.maintenance} dias` : "—"}</p>
                  </div>
                </div>
              </button>
              <div className="mt-4 flex items-center justify-between border-t border-[#E7EDF3] pt-3">
                <RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} />
                <button
                  onClick={() => onConsumables(index)}
                  className="text-xs text-primary hover:underline"
                  title={tooltipText}
                >
                  Configurar Consumo <span className="ml-1 text-muted">({consumablesCount})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}