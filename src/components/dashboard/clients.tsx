import React, { useState, useTransition } from "react";
import { Plus, Search, ShieldCheck, ShieldBan, Star, StarOff, Sparkles, X, ChevronDown } from "lucide-react";
import { type ClientItem } from "@/lib/actions/clients";
import { Badge, RowActions } from "../shared";
import { money } from "@/lib/demo-data";

type FilterTab = "all" | "whitelist" | "blacklist";

interface ConfirmAction {
  type: "add-whitelist" | "remove-whitelist" | "add-blacklist" | "remove-blacklist";
  clientIndex: number;
  clientName: string;
}

export function Clients({
  data,
  onNew,
  onAction,
  onArchive,
  onRestore,
  onToggleWhitelist,
  onToggleBlacklist,
}: {
  data: ClientItem[];
  onNew: () => void;
  onAction: (mode: "view" | "edit", index: number) => void;
  onArchive: (index: number) => void;
  onRestore: (index: number) => void;
  onToggleWhitelist?: (index: number, add: boolean) => Promise<void>;
  onToggleBlacklist?: (index: number, add: boolean) => Promise<void>;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

  // Filtragem e busca
  const filtered = data
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => showArchived ? true : c.status !== "Inativa" && c.status !== "archived")
    .filter(({ c }) => {
      if (filterTab === "whitelist") return c.whitelist && !c.blacklist;
      if (filterTab === "blacklist") return c.blacklist;
      return true;
    })
    .filter(({ c }) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });

  const whitelistCount = data.filter(c => c.whitelist && !c.blacklist).length;
  const blacklistCount = data.filter(c => c.blacklist).length;

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, clientIndex } = confirmAction;

    startTransition(async () => {
      if (type === "add-whitelist" || type === "remove-whitelist") {
        await onToggleWhitelist?.(clientIndex, type === "add-whitelist");
      } else {
        await onToggleBlacklist?.(clientIndex, type === "add-blacklist");
      }
      setConfirmAction(null);
      setActiveMenuIndex(null);
    });
  };

  const getActionLabel = (type: ConfirmAction["type"]) => {
    switch (type) {
      case "add-whitelist":    return { title: "Adicionar à White List", desc: "Esta cliente ficará isenta de sinal e poderá agendar online sem o relógio de 30 minutos.", btn: "Confirmar", tone: "emerald" };
      case "remove-whitelist": return { title: "Remover da White List", desc: "A cliente voltará ao fluxo normal de sinal obrigatório. Ela não será promovida automaticamente novamente.", btn: "Remover", tone: "amber" };
      case "add-blacklist":    return { title: "Adicionar à Black List", desc: "Esta cliente será marcada internamente. No agendamento online, ela verá a mensagem de sinal obrigatório (30 min de PIX). Ela não poderá ser promovida à White List.", btn: "Confirmar", tone: "red" };
      case "remove-blacklist": return { title: "Remover da Black List", desc: "A marcação de bloqueio será retirada. A cliente voltará ao fluxo normal.", btn: "Remover", tone: "slate" };
    }
  };

  return (
    <main className="page-content">
      {/* Header */}
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 text-muted" size={16} />
          <input
            className="field-input pl-9"
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived(!showArchived)} className="btn-secondary">
            {showArchived ? "Ocultar inativas" : "Mostrar inativas"}
          </button>
          <button onClick={onNew} className="btn-primary">
            <Plus size={16} />Nova cliente
          </button>
        </div>
      </div>

      {/* Filtro tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterTab("all")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${filterTab === "all" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Todas <span className="rounded-full bg-white/20 px-1.5">{data.length}</span>
        </button>
        <button
          onClick={() => setFilterTab("whitelist")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${filterTab === "whitelist" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
        >
          <ShieldCheck size={12} /> White List <span className={`rounded-full px-1.5 ${filterTab === "whitelist" ? "bg-white/20" : "bg-emerald-200"}`}>{whitelistCount}</span>
        </button>
        <button
          onClick={() => setFilterTab("blacklist")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${filterTab === "blacklist" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
        >
          <ShieldBan size={12} /> Black List <span className={`rounded-full px-1.5 ${filterTab === "blacklist" ? "bg-white/20" : "bg-red-200"}`}>{blacklistCount}</span>
        </button>
      </div>

      {/* Tabela */}
      <section className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Última visita</th>
                <th>Próxima manutenção</th>
                <th>Atendimentos</th>
                <th>Total gasto</th>
                <th>Classificação</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ c, index }) => (
                <tr key={c.id || c.name}>
                  {/* Nome */}
                  <td>
                    <button onClick={() => onAction("view", index)} className="text-left hover:text-primary">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted">{c.phone}</p>
                      {(c.packageCredits || 0) > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                            {c.packageCredits} {c.packageCredits === 1 ? "crédito restante" : "créditos restantes"}
                          </span>
                        </div>
                      )}
                    </button>
                  </td>

                  <td>{c.last}</td>
                  <td>{c.next}</td>
                  <td>{c.visits}</td>
                  <td>{money.format(c.spent)}</td>

                  {/* Classificação — coluna interativa */}
                  <td>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuIndex(activeMenuIndex === index ? null : index)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:shadow-sm"
                        style={{
                          borderColor: c.blacklist ? "#fca5a5" : c.whitelist ? "#6ee7b7" : "#e2e8f0",
                          background: c.blacklist ? "#fff1f2" : c.whitelist ? "#f0fdf4" : "#f8fafc",
                          color: c.blacklist ? "#dc2626" : c.whitelist ? "#16a34a" : "#64748b",
                        }}
                      >
                        {c.blacklist ? (
                          <><ShieldBan size={12} /> Bloqueada</>
                        ) : c.whitelist ? (
                          <><ShieldCheck size={12} /> VIP{c.autoPromoted && <span title="Promovida automaticamente por frequência"><Sparkles size={10} className="text-amber-400" /></span>}</>
                        ) : (
                          <><Star size={12} className="opacity-40" /> Normal</>
                        )}
                        <ChevronDown size={11} className="opacity-50" />
                      </button>

                      {/* Dropdown de ações */}
                      {activeMenuIndex === index && (
                        <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-[#DBE3EC] bg-white shadow-lg">
                          {!c.whitelist && !c.blacklist && (
                            <button
                              onClick={() => setConfirmAction({ type: "add-whitelist", clientIndex: index, clientName: c.name })}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                            >
                              <ShieldCheck size={13} /> Adicionar à White List
                            </button>
                          )}
                          {!c.whitelist && !c.blacklist && (
                            <button
                              onClick={() => setConfirmAction({ type: "add-blacklist", clientIndex: index, clientName: c.name })}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-700 hover:bg-red-50"
                            >
                              <ShieldBan size={13} /> Adicionar à Black List
                            </button>
                          )}
                          {c.whitelist && (
                            <>
                              <button
                                onClick={() => setConfirmAction({ type: "remove-whitelist", clientIndex: index, clientName: c.name })}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-amber-700 hover:bg-amber-50"
                              >
                                <StarOff size={13} /> Remover da White List
                              </button>
                              <button
                                onClick={() => setConfirmAction({ type: "add-blacklist", clientIndex: index, clientName: c.name })}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-700 hover:bg-red-50"
                              >
                                <ShieldBan size={13} /> Mover para Black List
                              </button>
                            </>
                          )}
                          {c.blacklist && (
                            <>
                              <button
                                onClick={() => setConfirmAction({ type: "remove-blacklist", clientIndex: index, clientName: c.name })}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <X size={13} /> Remover da Black List
                              </button>
                              <button
                                onClick={() => setConfirmAction({ type: "add-whitelist", clientIndex: index, clientName: c.name })}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                              >
                                <ShieldCheck size={13} /> Mover para White List
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <Badge tone={c.status === "Ativa" ? "primary" : "neutral"}>
                      {c.status === "archived" ? "Inativa" : c.status}
                    </Badge>
                  </td>

                  {/* Ações de linha */}
                  <td>
                    {c.status === "Inativa" || c.status === "archived" ? (
                      <button onClick={() => onRestore(index)} className="text-xs text-primary hover:underline">
                        Reativar
                      </button>
                    ) : (
                      <RowActions
                        onView={() => onAction("view", index)}
                        onEdit={() => onAction("edit", index)}
                        onDelete={() => onArchive(index)}
                        deleteLabel="Arquivar"
                      />
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted">
                    Nenhuma cliente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Overlay para fechar dropdown ao clicar fora */}
      {activeMenuIndex !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveMenuIndex(null)}
        />
      )}

      {/* Modal de confirmação */}
      {confirmAction && (() => {
        const info = getActionLabel(confirmAction.type);
        const toneColors: Record<string, string> = {
          emerald: "bg-emerald-600 hover:bg-emerald-700",
          amber:   "bg-amber-500 hover:bg-amber-600",
          red:     "bg-red-600 hover:bg-red-700",
          slate:   "bg-slate-600 hover:bg-slate-700",
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <h3 className="font-semibold text-ink">{info.title}</h3>
              <p className="mt-1.5 text-xs text-muted">
                <span className="font-medium text-ink">{confirmAction.clientName}</span> — {info.desc}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setConfirmAction(null); setActiveMenuIndex(null); }}
                  className="flex-1 btn-secondary"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition ${toneColors[info.tone]} disabled:opacity-60`}
                >
                  {isPending ? "Salvando..." : info.btn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}