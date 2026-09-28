import React from "react";
import { TrendingUp, Users, Clock, ShoppingBag, Package } from "lucide-react";
import { Badge, SectionTitle, Metric } from "../shared";
import { money } from "@/lib/demo-data";

export function Reports({ data }: { data: any }) {
  if (!data || data.error) {
    return (
      <main className="page-content flex items-center justify-center py-20 text-muted">
        <p>Não foi possível carregar os relatórios: {data?.error || "Dados indisponíveis"}</p>
      </main>
    );
  }

  const {
    topClientsByVisits = [],
    topClientsBySpent = [],
    busiestDays = [],
    busiestHours = [],
    totalConsumptionCost = 0,
    topProducts = [],
    recentAppointmentConsumption = []
  } = data;

  return (
    <main className="page-content space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric 
          label="Custo Total de Consumo" 
          value={money.format(totalConsumptionCost)} 
          detail="Baseado nos atendimentos" 
          icon={Package} 
          tone="warning" 
        />
        <Metric 
          label="Melhor Dia" 
          value={busiestDays[0]?.day || "—"} 
          detail={busiestDays[0] ? `${busiestDays[0].count} agendamentos` : ""} 
          icon={TrendingUp} 
        />
        <Metric 
          label="Horário de Pico" 
          value={busiestHours[0]?.hour || "—"} 
          detail={busiestHours[0] ? `${busiestHours[0].count} agendamentos` : ""} 
          icon={Clock} 
        />
        <Metric 
          label="Cliente Top" 
          value={topClientsBySpent[0]?.name?.split(" ")[0] || "—"} 
          detail={topClientsBySpent[0] ? money.format(topClientsBySpent[0].spent) : ""} 
          icon={Users} 
          tone="success" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clients Ranking */}
        <section className="card">
          <SectionTitle title="Ranking de Clientes" subtitle="As que mais frequentam e investem" />
          
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted">Mais Visitas</h4>
              <div className="space-y-3">
                {topClientsByVisits.length === 0 && <p className="text-xs text-muted">Nenhum dado.</p>}
                {topClientsByVisits.map((client: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-[#E7EDF3] pb-2 last:border-0">
                    <span className="text-sm font-medium">{i + 1}. {client.name}</span>
                    <Badge tone="neutral">{client.visits}x</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted">Maior Valor Gasto</h4>
              <div className="space-y-3">
                {topClientsBySpent.length === 0 && <p className="text-xs text-muted">Nenhum dado.</p>}
                {topClientsBySpent.map((client: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-[#E7EDF3] pb-2 last:border-0">
                    <span className="text-sm font-medium text-truncate pr-2">{i + 1}. {client.name}</span>
                    <span className="text-sm font-semibold text-primary shrink-0">{money.format(client.spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Analytics */}
        <section className="card">
          <SectionTitle title="Inteligência de Agenda" subtitle="Dias e horários mais movimentados" />
          
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted">Dias da Semana</h4>
              <div className="space-y-3">
                {busiestDays.length === 0 && <p className="text-xs text-muted">Nenhum dado.</p>}
                {busiestDays.map((day: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-[#E7EDF3] pb-2 last:border-0">
                    <span className="text-sm font-medium">{day.day}</span>
                    <span className="text-sm font-semibold">{day.count} <span className="text-xs font-normal text-muted">agendamentos</span></span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted">Horários de Pico</h4>
              <div className="space-y-3">
                {busiestHours.length === 0 && <p className="text-xs text-muted">Nenhum dado.</p>}
                {busiestHours.map((hour: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-[#E7EDF3] pb-2 last:border-0">
                    <span className="text-sm font-medium">{hour.hour}</span>
                    <Badge tone="primary">{hour.count} agendamentos</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Consumed Products */}
        <section className="card lg:col-span-1">
          <SectionTitle title="Top Produtos Consumidos" subtitle="Por quantidade" />
          <div className="mt-4 space-y-4">
            {topProducts.length === 0 && <p className="text-xs text-muted">Nenhum consumo registrado.</p>}
            {topProducts.map((prod: any, i: number) => (
              <div key={i} className="flex flex-col gap-1 border-b border-[#E7EDF3] pb-3 last:border-0">
                <span className="text-sm font-medium">{i + 1}. {prod.name}</span>
                <div className="flex justify-between text-xs text-muted">
                  <span>{prod.quantity} {prod.unit}</span>
                  <span>Custo total: {money.format(prod.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Appointments Consumption */}
        <section className="card lg:col-span-2">
          <SectionTitle title="Histórico de Consumo por Atendimento" subtitle="Últimas baixas automáticas" />
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Insumos Baixados</th>
                  <th className="text-right">Custo Gerado (R$)</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointmentConsumption.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted">Nenhum consumo registrado recentemente.</td></tr>
                ) : (
                  recentAppointmentConsumption.map((app: any, i: number) => {
                    const d = app.date ? new Date(app.date) : new Date();
                    return (
                      <tr key={i}>
                        <td className="whitespace-nowrap">{d.toLocaleDateString("pt-BR")} às {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}</td>
                        <td className="font-medium">{app.client_name}</td>
                        <td className="text-xs text-muted max-w-xs truncate" title={app.items.join("\n")}>
                          {app.items.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {app.items.slice(0, 2).map((item: string, j: number) => <span key={j}>{item}</span>)}
                              {app.items.length > 2 && <span className="text-primary">+{app.items.length - 2} itens...</span>}
                            </div>
                          ) : "Nenhum"}
                        </td>
                        <td className="text-right font-medium text-danger">{money.format(app.cost)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </main>
  );
}
