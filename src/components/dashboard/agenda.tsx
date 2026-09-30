import React, { useState } from "react";
import { Plus, CalendarDays, Activity, Lock, Unlock } from "lucide-react";
import { type Appointment } from "@/lib/demo-data";
import { Badge, RowActions } from "../shared";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Agenda({
  rows,
  onNew,
  onAttendance,
  onAction,
  onCancel,
  onStatusChange,
  onToggleBlockDay
}: {
  rows: Appointment[];
  onNew: () => void;
  onAttendance: (a: Appointment) => void;
  onAction: (mode: "view" | "edit", index: number) => void;
  onCancel: (index: number, id: string) => void;
  onStatusChange: (a: Appointment, status: string) => void;
  onToggleBlockDay?: (dateStr: string) => Promise<void>;
}) {
  const [calendarView, setCalendarView] = useState<"dia" | "semana" | "mes">("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const [profFilter, setProfFilter] = useState("Todas as profissionais");
  const [serviceFilter, setServiceFilter] = useState("Todos os serviços");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  const [blocking, setBlocking] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const uniqueProfs = Array.from(new Set(rows.map(r => r.professional))).filter(Boolean);
  const uniqueStatus = ["Aguardando sinal", "Agendado", "Confirmado", "Cliente chegou", "Em atendimento", "Concluído"];

  const isDayBlocked = rows.some(
    (r: any) =>
      r.dateStr === selectedDate &&
      r.status !== "Cancelado" &&
      r.status !== "Cancelada" &&
      (
        r.clientId === null ||
        r.client === "Bloqueio de Agenda" ||
        r.service?.toLowerCase().includes("bloqueio")
      )
  );

  const handleOpenBlockModal = () => {
    if (!onToggleBlockDay) return;
    setShowBlockModal(true);
  };

  const getMedicalAlert = (notes: string) => {
    if (!notes || !notes.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(notes);
      if (parsed.anamnesis) {
        const an = parsed.anamnesis;
        const issues = [];
        if (an.diabetes) issues.push("Diabetes");
        if (an.gestante) issues.push("Gestante");
        if (an.roeUnha) issues.push("Roe unhas");
        if (an.alergias) issues.push(`Alergia: ${an.alergias}`);
        if (issues.length > 0) return issues.join(" | ");
      }
    } catch (e) {}
    return null;
  };

  const visibleRows = rows
    .filter((r: any) => {
      // Exclude system block entries from the client appointment list
      if (
        r.clientId === null ||
        r.client === "Bloqueio de Agenda" ||
        r.service?.toLowerCase().includes("bloqueio")
      ) {
        return false;
      }

      let inRange = false;
      if (calendarView === "dia") {
        inRange = r.dateStr === selectedDate;
      } else if (calendarView === "mes") {
        inRange = r.dateStr.substring(0, 7) === selectedDate.substring(0, 7);
      } else if (calendarView === "semana") {
        const d = new Date(selectedDate + "T12:00:00");
        const day = d.getDay();
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(d);
        endOfWeek.setDate(d.getDate() + (6 - day));
        endOfWeek.setHours(23, 59, 59, 999);
        const rDate = new Date(r.dateStr + "T12:00:00");
        inRange = rDate >= startOfWeek && rDate <= endOfWeek;
      }
      if (!inRange) return false;
      if (profFilter !== "Todas as profissionais" && r.professional !== profFilter) return false;
      if (statusFilter !== "Todos os status" && r.status !== statusFilter) return false;
      if (statusFilter === "Todos os status" && (r.status === "Cancelado" || r.status === "Cancelada")) return false;
      if (serviceFilter !== "Todos os serviços" && !r.service.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      return a.time.localeCompare(b.time);
    });

  const blockedDays = Array.from(
    new Set(
      rows
        .filter(
          (r: any) =>
            r.status !== "Cancelado" &&
            r.status !== "Cancelada" &&
            (
              r.clientId === null ||
              r.client === "Bloqueio de Agenda" ||
              r.service?.toLowerCase().includes("bloqueio")
            )
        )
        .map((r: any) => r.dateStr)
    )
  ).sort();

  return (
    <main className="page-content">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="field-input w-auto font-medium text-sm"
          />
          <div className="hidden sm:flex rounded-md border border-[#DBE3EC] bg-white p-1 ml-2">
            <button
              onClick={() => setCalendarView("dia")}
              className={`rounded-sm px-4 py-1.5 text-xs font-medium ${
                calendarView === "dia" ? "bg-primary text-white" : "text-muted hover:bg-bg"
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setCalendarView("semana")}
              className={`rounded-sm px-4 py-1.5 text-xs font-medium ${
                calendarView === "semana" ? "bg-primary text-white" : "text-muted hover:bg-bg"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setCalendarView("mes")}
              className={`rounded-sm px-4 py-1.5 text-xs font-medium ${
                calendarView === "mes" ? "bg-primary text-white" : "text-muted hover:bg-bg"
              }`}
            >
              Mês
            </button>
          </div>
          <div className="hidden sm:flex items-center ml-2 bg-[#F7F9FC] border border-[#DBE3EC] px-3 py-1.5 rounded-md text-xs font-medium text-muted">
            {visibleRows.length} atendimento{visibleRows.length !== 1 && "s"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleBlockDay && (
            <button
              type="button"
              onClick={handleOpenBlockModal}
              disabled={blocking}
              className={`btn-outline flex items-center gap-1.5 text-xs py-2 px-3 transition-colors ${
                isDayBlocked
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  : "border-[#DBE3EC] text-ink hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50"
              }`}
            >
              {isDayBlocked ? <Unlock size={15} /> : <Lock size={15} />}
              {blocking ? "Processando..." : isDayBlocked ? "Desbloquear Dia" : "Bloquear Dia Inteiro"}
            </button>
          )}
          <button onClick={onNew} className="btn-primary">
            <Plus size={16} />
            Novo agendamento
          </button>
        </div>
      </div>

      {blockedDays.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Lock size={14} className="text-amber-700" />
            Dias Bloqueados na Agenda ({blockedDays.length}):
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {blockedDays.map((dStr) => {
              const isSelected = dStr === selectedDate;
              const formatted = dStr.split("-").reverse().join("/");
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setSelectedDate(dStr)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    isSelected
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  📅 {formatted} {isSelected ? "(selecionado)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isDayBlocked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-200 text-amber-900 shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Agenda Bloqueada para Ausência no dia {selectedDate.split("-").reverse().join("/")}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Nenhuma cliente conseguirá agendar horários online nesta data.
              </p>
            </div>
          </div>
          {onToggleBlockDay && (
            <button
              type="button"
              onClick={handleOpenBlockModal}
              disabled={blocking}
              className="btn-outline text-xs py-1.5 px-3 bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
            >
              Desbloquear Dia
            </button>
          )}
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" onClick={() => setShowBlockModal(false)} className="fixed inset-0 bg-navy-dark/40" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl z-10 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
              {isDayBlocked ? <Unlock size={24} /> : <Lock size={24} />}
            </div>
            <h3 className="text-lg font-bold text-ink">
              {isDayBlocked ? "Desbloquear Agenda do Dia" : "Bloquear Agenda do Dia"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {isDayBlocked
                ? `Deseja desbloquear os horários do dia ${selectedDate.split("-").reverse().join("/")}? Os agendamentos online das clientes voltarão a ficar disponíveis.`
                : `Deseja bloquear toda a agenda do dia ${selectedDate.split("-").reverse().join("/")}? Nenhuma cliente conseguirá agendar horários online nesta data.`}
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E7EDF3] pt-4">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="btn-outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={blocking}
                onClick={async () => {
                  if (!onToggleBlockDay) return;
                  setBlocking(true);
                  try {
                    await onToggleBlockDay(selectedDate);
                    setShowBlockModal(false);
                  } finally {
                    setBlocking(false);
                  }
                }}
                className={`btn-primary ${
                  isDayBlocked
                    ? "bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                    : "bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
                }`}
              >
                {blocking ? "Processando..." : isDayBlocked ? "Confirmar Desbloqueio" : "Confirmar Bloqueio"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <select className="field-input" aria-label="Profissional" value={profFilter} onChange={(e) => setProfFilter(e.target.value)}>
          <option>Todas as profissionais</option>
          {uniqueProfs.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className="field-input" aria-label="Serviço" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
          <option>Todos os serviços</option>
          <option>Manicure</option>
          <option>Pedicure</option>
          <option>Nail art</option>
          <option>Spa</option>
          <option>Alongamento</option>
          <option>Blindagem</option>
          <option>Esmaltação</option>
        </select>
        <select className="field-input" aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Todos os status</option>
          {uniqueStatus.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <section className="card !p-0 overflow-hidden">
        <div className="border-b border-[#E7EDF3] bg-[#F7F9FC] px-5 py-3 text-xs text-muted">
          {calendarView === "dia"
            ? "08:00 — 19:00 · Intervalos de 15 minutos"
            : calendarView === "semana"
            ? "Agendamentos da Semana"
            : "Agendamentos do Mês"}
        </div>
        <div className="divide-y divide-[#E7EDF3]">
          {visibleRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Nenhum agendamento encontrado para esta pesquisa.</p>
          ) : (
            visibleRows.map((a, index) => (
              <div key={a.id} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-bg sm:px-5">
                <button
                  onClick={a.status === "Em atendimento" || a.status === "Cliente chegou" ? () => onAttendance(a) : () => onAction("view", rows.indexOf(a))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="w-16 shrink-0">
                    {calendarView !== "dia" && (
                      <p className="text-[10px] font-bold text-primary mb-0.5">
                        {(a as any).dateStr.split("-").reverse().slice(0, 2).join("/")}
                      </p>
                    )}
                    <p className="font-semibold">{a.time}</p>
                    <p className="text-[10px] text-muted">{a.end}</p>
                  </div>
                  <div className={`h-12 w-1 rounded-full ${a.service?.includes("Bloqueio") ? "bg-amber-500" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{a.client}</p>
                      {a.source === "Online" && <Badge tone="blue">Online</Badge>}
                      {a.service?.includes("Bloqueio") && <Badge tone="amber">Ausência</Badge>}
                      {(() => {
                        const alert = getMedicalAlert((a as any).clientNotes);
                        return alert ? (
                          <span title={alert} className="cursor-help">
                            <Badge tone="danger">
                              <Activity size={12} className="mr-1 inline" /> Alerta Médico
                            </Badge>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="truncate text-xs text-muted">
                      {a.service} · {a.professional}
                    </p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="font-medium">{money.format(a.price)}</p>
                    <p className="text-[10px] text-muted">{a.paid ? `${money.format(a.paid)} recebido` : "Pagamento pendente"}</p>
                  </div>
                  <div className="hidden sm:block">
                    <select
                      value={a.status}
                      disabled={a.status === "Concluído" || a.service?.includes("Bloqueio")}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStatusChange(a, e.target.value)}
                      className="field-input !py-1 !text-xs !h-8 w-32 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="Aguardando sinal">Aguardando sinal</option>
                      <option value="Agendado">Agendado</option>
                      <option value="Confirmado">Confirmado</option>
                      <option value="Cliente chegou">Cliente chegou</option>
                      <option value="Em atendimento">Em atendimento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </button>
                <button onClick={() => onAction("view", rows.indexOf(a))} className="text-sm font-medium text-primary hover:underline">
                  Comissões
                </button>
                <RowActions
                  onView={() => onAction("edit", rows.indexOf(a))}
                  onEdit={() => onAction("edit", rows.indexOf(a))}
                  onDelete={() => onCancel(rows.indexOf(a), a.id)}
                  deleteLabel="Cancelar"
                />
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}