import React from "react";
import { Plus, TrendingUp, CircleDollarSign, CreditCard, BarChart3, Download, PieChart } from "lucide-react";
import { Badge, SectionTitle, RowActions, Metric } from "../shared";
import { money } from "@/lib/demo-data";

export function Finance({ data, stats, onNew, onAction, onReverse }: { data: any[]; stats?: any; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onReverse: (index: number) => void }) { 
  
  return (
    <main className="page-content space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Faturamento Bruto" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Entrada total" icon={TrendingUp} />
        <Metric label="Despesas Fixas" value={stats ? money.format(stats.expenses) : "R$ 0,00"} detail="Contas do mês" icon={CreditCard} tone="warning" />
        <Metric label="Comissões" value={stats ? money.format(stats.commissions) : "R$ 0,00"} detail="A repassar" icon={CircleDollarSign} tone="warning" />
        <Metric label="Lucro Líquido" value={stats ? money.format(stats.balance) : "R$ 0,00"} detail="No seu bolso" icon={BarChart3} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* DRE (Demonstrativo de Resultado) */}
        <section className="card lg:col-span-1 border-primary/20">
          <SectionTitle title="DRE Simplificado" subtitle="De onde vem o Lucro Líquido?" />
          
          <div className="mt-5 space-y-4 font-medium text-sm">
            <div className="flex justify-between text-success">
              <span>(+) Faturamento Bruto</span>
              <span>{stats ? money.format(stats.revenue) : "R$ 0,00"}</span>
            </div>
            
            <div className="border-t border-[#E7EDF3] pt-4 flex justify-between text-danger">
              <span>(-) Custo de Produtos</span>
              <span>{stats ? money.format(stats.consumptionCost || 0) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-danger">
              <span>(-) Comissões da Equipe</span>
              <span>{stats ? money.format(stats.commissions) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-danger pb-4 border-b border-[#E7EDF3]">
              <span>(-) Despesas Gerais/Fixas</span>
              <span>{stats ? money.format(stats.expenses) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold text-navy-dark pt-2">
              <span>(=) Lucro Líquido Real</span>
              <span className={stats?.balance >= 0 ? "text-success" : "text-danger"}>{stats ? money.format(stats.balance) : "R$ 0,00"}</span>
            </div>
          </div>
          
          <div className="mt-6 rounded-md bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-xs text-emerald-800 text-center">
              Esta visão deduz automaticamente todos os produtos consumidos nas mesas, garantindo que o seu lucro seja 100% real.
            </p>
          </div>
        </section>

        {/* Movimentos recentes */}
        <section className="card lg:col-span-2">
          <SectionTitle title="Movimentos recentes" action={<button onClick={onNew} className="btn-primary"><Plus size={15} />Novo lançamento</button>} />
          <div className="overflow-x-auto mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente/Descrição</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhum movimento registrado.</td></tr>
                )}
                {data.map((item, index) => (
                  <tr key={`${item.date}-${item.name}-${index}`}>
                    <td className="whitespace-nowrap">{item.date}</td>
                    <td>
                      <button onClick={() => onAction("view", index)} className="font-medium hover:text-primary text-left">
                        {item.name}
                      </button>
                    </td>
                    <td>{item.type}</td>
                    <td>{item.method}</td>
                    <td>
                      <Badge tone={item.status === "Pago" ? "success" : item.status === "Estornado" ? "danger" : "warning"}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className={`font-medium whitespace-nowrap ${item.value >= 0 ? "text-primary" : "text-danger"}`}>
                      {money.format(item.value)}
                    </td>
                    <td>
                      <RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onReverse(index)} deleteLabel="Estornar" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </main>
  );
}
