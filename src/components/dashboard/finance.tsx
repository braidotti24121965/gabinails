import React, { useState, useEffect } from "react";
import { Plus, TrendingUp, CircleDollarSign, CreditCard, BarChart3, CalendarClock, Calendar, PackageOpen, Search, X } from "lucide-react";
import { Badge, SectionTitle, RowActions, Metric } from "../shared";
import { money } from "@/lib/demo-data";
import { ExpenseManager } from "./expense-manager";

export function Finance({ data, stats, onNew, onAction, onReverse }: { data: any[]; stats?: any; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onReverse: (index: number) => void }) { 
  const [period, setPeriod] = useState("month");
  const [movementSearch, setMovementSearch] = useState("");
  const [expenseDialog, setExpenseDialog] = useState<any | "new" | null>(null);
  const [financeData, setFinanceData] = useState(data);
  const [financeStats, setFinanceStats] = useState(stats);
  const [loading, setLoading] = useState(false);
  const [futureRevenue, setFutureRevenue] = useState<{ total: number; lastDate: string | null; count: number } | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { getFinance } = await import("@/lib/actions/finance");
    const res = await getFinance(period);
    setFinanceData(res.data);
    setFinanceStats(res.stats);
    setLoading(false);
  }, [period]);

  // Carrega faturamento futuro (independente do período selecionado)
  useEffect(() => {
    import("@/lib/actions/finance").then(({ getFutureRevenue }) => {
      getFutureRevenue().then(setFutureRevenue);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReverse = async (id: string, index: number) => {
    if (confirm("Tem certeza que deseja estornar este pagamento?")) {
      const { reversePayment } = await import("@/lib/actions/finance");
      const res = await reversePayment(id);
      if (res.success) {
        loadData();
      } else {
        alert("Erro ao estornar: " + res.error);
      }
    }
  };

  const getPeriodDetailLabel = () => {
    switch (period) {
      case "today": return "Do dia de hoje";
      case "month": return "Mês atual";
      case "last_month": return "Mês anterior";
      case "30days": return "Últimos 30 dias";
      case "all": return "Todo o período";
      default: return "Período selecionado";
    }
  };

  const normalizedSearch = movementSearch.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filteredMovements = normalizedSearch
    ? financeData.filter(item => [item.name, item.type, item.status, item.method, item.date, String(Math.abs(item.value))]
        .some(value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedSearch)))
    : financeData;

  return (
    <main className="page-content space-y-6">
      {/* Seletor de Período */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E7EDF3] bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="text-primary" size={18} />
          <span className="text-xs font-semibold text-navy-dark uppercase tracking-wider">Filtrar Período:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "today", label: "Hoje" },
            { id: "month", label: "Este Mês" },
            { id: "last_month", label: "Mês Anterior" },
            { id: "30days", label: "Últimos 30 dias" },
            { id: "all", label: "Todo o histórico" },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              disabled={loading}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                period === p.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:opacity-50`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de métricas */}
      <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
        <Metric label="Faturamento Bruto" value={financeStats ? money.format(financeStats.revenue) : "R$ 0,00"} detail={getPeriodDetailLabel()} icon={TrendingUp} />
        <div className="card flex flex-col gap-2" aria-label="Despesas Fixas">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Despesas Fixas</p>
              <p className="mt-1 text-2xl font-bold text-ink">{money.format(financeStats?.totalRegisteredExpenses ?? financeStats?.expenses ?? 0)}</p>
              <p className="mt-1 text-xs text-muted">{getPeriodDetailLabel()}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><CreditCard size={17} /></div>
          </div>
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 text-xs">
            <div className="flex justify-between gap-2"><span className="text-muted">Pagas</span><span className="font-semibold text-ink">{money.format(financeStats?.expenses ?? 0)}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted">Pendentes</span><span className="font-semibold text-amber-700">{money.format(financeStats?.pendingExpenses ?? 0)}</span></div>
          </div>
        </div>
        <Metric label="Custo de Produtos" value={financeStats ? money.format(financeStats.consumptionCost || 0) : "R$ 0,00"} detail="Consumo no período" icon={PackageOpen} tone="warning" />
        <Metric label="Comissões" value={financeStats ? money.format(financeStats.commissions) : "R$ 0,00"} detail="A repassar no período" icon={CircleDollarSign} tone="warning" />
        <Metric label="Lucro Líquido" value={financeStats ? money.format(financeStats.balance) : "R$ 0,00"} detail="No seu bolso no período" icon={BarChart3} tone="success" />

        {/* Card de Faturamento Futuro */}
        <div className="card flex flex-col justify-between gap-3 border-l-4 border-l-violet-400">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Faturamento Futuro</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {futureRevenue ? money.format(futureRevenue.total) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {futureRevenue && futureRevenue.count > 0
                  ? `${futureRevenue.count} agendamento${futureRevenue.count > 1 ? "s" : ""} a receber`
                  : "Nenhum agendamento futuro"}
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <CalendarClock size={17} />
            </div>
          </div>
          {futureRevenue?.lastDate && (
            <div className="rounded-md bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-700">
              <span className="font-medium">Último agendamento:</span> {futureRevenue.lastDate}
            </div>
          )}
          {(!futureRevenue || !futureRevenue.lastDate) && (
            <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">
              Sem agendamentos futuros
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* DRE (Demonstrativo de Resultado) */}
        <section className="card lg:col-span-1 border-primary/20">
          <SectionTitle title="DRE Simplificado" subtitle={`Período: ${getPeriodDetailLabel()}`} />
          
          <div className="mt-5 space-y-4 font-medium text-sm">
            <div className="flex justify-between text-success">
              <span>(+) Faturamento Bruto</span>
              <span>{financeStats ? money.format(financeStats.revenue) : "R$ 0,00"}</span>
            </div>
            
            <div className="border-t border-[#E7EDF3] pt-4 flex justify-between text-danger">
              <span>(-) Custo de Produtos</span>
              <span>{financeStats ? money.format(financeStats.consumptionCost || 0) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-danger">
              <span>(-) Comissões da Equipe</span>
              <span>{financeStats ? money.format(financeStats.commissions) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-danger pb-4 border-b border-[#E7EDF3]">
              <span>(-) Despesas Gerais/Fixas</span>
              <span>{financeStats ? money.format(financeStats.expenses) : "R$ 0,00"}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold text-navy-dark pt-2">
              <span>(=) Lucro Líquido Real</span>
              <span className={financeStats?.balance >= 0 ? "text-success" : "text-danger"}>{financeStats ? money.format(financeStats.balance) : "R$ 0,00"}</span>
            </div>
          </div>
          
          <div className={`mt-6 rounded-md border p-4 ${financeStats?.balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
            <p className="text-xs text-emerald-800 text-center font-semibold mb-1">
              Ticket Médio Líquido: {financeStats ? money.format(financeStats.netAverageTicket || 0) : "R$ 0,00"}
            </p>
            {financeStats?.balance >= 0 ? (
              <p className="text-xs text-emerald-700 text-center">Você está com saldo positivo neste período. Excelente!</p>
            ) : (
              <p className="text-xs text-red-700 text-center">Atenção: O saldo está negativo neste período.</p>
            )}
          </div>

          {/* Previsão futura no DRE */}
          {futureRevenue && futureRevenue.total > 0 && (
            <div className="mt-4 rounded-md border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs font-semibold text-violet-800 mb-0.5">Previsão a receber</p>
              <p className="text-base font-bold text-violet-700">{money.format(futureRevenue.total)}</p>
              <p className="text-[10px] text-violet-600 mt-0.5">
                {futureRevenue.count} agendamento{futureRevenue.count > 1 ? "s" : ""} confirmado{futureRevenue.count > 1 ? "s" : ""}
                {futureRevenue.lastDate ? ` · até ${futureRevenue.lastDate}` : ""}
              </p>
            </div>
          )}
        </section>

        {/* Movimentos recentes */}
        <section className="card lg:col-span-2">
          <SectionTitle title="Movimentos do Período" action={<button onClick={() => setExpenseDialog("new")} className="btn-primary"><Plus size={15} />Novo lançamento</button>} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="relative block w-full max-w-md">
              <span className="sr-only">Buscar movimentos por descrição, tipo, status ou data</span>
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={movementSearch}
                onChange={e => setMovementSearch(e.target.value)}
                placeholder="Buscar descrição, tipo, status ou data..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              {movementSearch && <button type="button" aria-label="Limpar busca" onClick={() => setMovementSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"><X size={16} /></button>}
            </label>
            <span className="text-xs text-muted" aria-live="polite">{filteredMovements.length} de {financeData.length} movimentos no período</span>
          </div>
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
                {filteredMovements.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">{movementSearch.trim() ? "Nenhum movimento encontrado para esta busca no período selecionado." : "Nenhum movimento registrado neste período."}</td></tr>
                )}
                {filteredMovements.map((item) => {\n                  const index = financeData.indexOf(item);\n                  return (
                  <tr key={`${item.date}-${item.name}-${index}`}>
                    <td className="whitespace-nowrap">{item.date}</td>
                    <td>
                      <button onClick={() => item.type === "Despesa" ? setExpenseDialog(item) : onAction("view", index)} className="font-medium hover:text-primary text-left">
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
                      {money.format(Math.abs(item.value))}{item.value < 0 ? " (−)" : ""}
                    </td>
                    <td>
                      {item.type === "Despesa" ? <button type="button" className="btn-outline" onClick={() => setExpenseDialog(item)}>Editar despesa</button> : <RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => handleReverse(item.id, index)} deleteLabel="Estornar" />}
                    </td>
                  </tr>
                  );\n                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {expenseDialog && <ExpenseManager expense={expenseDialog === "new" ? undefined : expenseDialog} close={() => setExpenseDialog(null)} saved={() => void loadData()} />}
    </main>
  );
}
