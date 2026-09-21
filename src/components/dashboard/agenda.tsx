import React, { useState } from "react";
import { Plus, ArrowRight, Search, CalendarDays } from "lucide-react";
import { type Appointment } from "@/lib/demo-data";
import { Badge, SectionTitle, statusTone, RowActions } from "../nail-studio-app";

// Money formatter is missing in agenda? Wait, is money used in Agenda? Yes.
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Agenda({ rows, onNew, onAttendance, onAction, onCancel, onStatusChange }: { rows: Appointment[]; onNew: () => void; onAttendance: (a: Appointment) => void; onAction: (mode: "view" | "edit", index: number) => void; onCancel: (index: number, id: string) => void; onStatusChange: (a: Appointment, status: string) => void }) {
  const [calendarView, setCalendarView] = useState<"dia"|"semana"|"mes">("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const [profFilter, setProfFilter] = useState("Todas as profissionais");
  const [serviceFilter, setServiceFilter] = useState("Todos os serviços");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  
  const uniqueProfs = Array.from(new Set(rows.map(r => r.professional))).filter(Boolean);
  const uniqueStatus = ["Aguardando sinal", "Agendado", "Confirmado", "Cliente chegou", "Em atendimento", "Concluído"];
  
  const visibleRows = rows.filter((r: any) => {
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
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(d);
      endOfWeek.setDate(d.getDate() + (6 - day));
      endOfWeek.setHours(23,59,59,999);
      const rDate = new Date(r.dateStr + "T12:00:00");
      inRange = rDate >= startOfWeek && rDate <= endOfWeek;
    }
    if (!inRange) return false;
    if (profFilter !== "Todas as profissionais" && r.professional !== profFilter) return false;
    if (statusFilter !== "Todos os status" && r.status !== statusFilter) return false;
    if (statusFilter === "Todos os status" && (r.status === "Cancelado" || r.status === "Cancelada")) return false;
    if (serviceFilter !== "Todos os serviços" && !r.service.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
    return true;
  }).sort((a: any, b: any) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    return a.time.localeCompare(b.time);
  });


  return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="field-input w-auto font-medium text-sm" /><div className="hidden sm:flex rounded-md border border-[#DBE3EC] bg-white p-1 ml-2">
    <button onClick={() => setCalendarView("dia")} className={`rounded-sm px-4 py-1.5 text-xs font-medium ${calendarView === "dia" ? "bg-primary text-white" : "text-muted hover:bg-bg"}`}>Dia</button>
    <button onClick={() => setCalendarView("semana")} className={`rounded-sm px-4 py-1.5 text-xs font-medium ${calendarView === "semana" ? "bg-primary text-white" : "text-muted hover:bg-bg"}`}>Semana</button>
    <button onClick={() => setCalendarView("mes")} className={`rounded-sm px-4 py-1.5 text-xs font-medium ${calendarView === "mes" ? "bg-primary text-white" : "text-muted hover:bg-bg"}`}>Mês</button>
  </div><div className="hidden sm:flex items-center ml-2 bg-[#F7F9FC] border border-[#DBE3EC] px-3 py-1.5 rounded-md text-xs font-medium text-muted">{visibleRows.length} atendimento{visibleRows.length !== 1 && "s"}</div></div><button onClick={onNew} className="btn-primary"><Plus size={16} />Novo agendamento</button></div><div className="mb-4 grid gap-3 sm:grid-cols-3"><select className="field-input" aria-label="Profissional" value={profFilter} onChange={e => setProfFilter(e.target.value)}><option>Todas as profissionais</option>{uniqueProfs.map(p => <option key={p}>{p}</option>)}</select><select className="field-input" aria-label="Serviço" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}><option>Todos os serviços</option><option>Manicure</option><option>Pedicure</option><option>Nail art</option><option>Spa</option><option>Alongamento</option><option>Blindagem</option><option>Esmaltação</option></select><select className="field-input" aria-label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Todos os status</option>{uniqueStatus.map(s => <option key={s}>{s}</option>)}</select></div><section className="card !p-0 overflow-hidden"><div className="border-b border-[#E7EDF3] bg-[#F7F9FC] px-5 py-3 text-xs text-muted">{calendarView === "dia" ? "08:00 — 19:00 · Intervalos de 15 minutos" : calendarView === "semana" ? "Agendamentos da Semana" : "Agendamentos do Mês"}</div><div className="divide-y divide-[#E7EDF3]">{visibleRows.length === 0 ? <p className="p-8 text-center text-sm text-muted">Nenhum agendamento encontrado para esta pesquisa.</p> : visibleRows.map((a, index) => <div key={a.id} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-bg sm:px-5"><button onClick={a.status === "Em atendimento" || a.status === "Cliente chegou" ? () => onAttendance(a) : () => onAction("view", rows.indexOf(a))} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className="w-16 shrink-0">
    {calendarView !== "dia" && <p className="text-[10px] font-bold text-primary mb-0.5">{(a as any).dateStr.split("-").reverse().slice(0,2).join("/")}</p>}
    <p className="font-semibold">{a.time}</p>
    <p className="text-[10px] text-muted">{a.end}</p>
  </div><div className={`h-12 w-1 rounded-full bg-primary`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium">{a.client}</p>{a.source === "Online" && <Badge tone="blue">Online</Badge>}</div><p className="truncate text-xs text-muted">{a.service} · {a.professional}</p></div><div className="hidden text-right md:block"><p className="font-medium">{money.format(a.price)}</p><p className="text-[10px] text-muted">{a.paid ? `${money.format(a.paid)} recebido` : "Pagamento pendente"}</p></div><div className="hidden sm:block">
     <select 
       value={a.status}
       disabled={a.status === "Concluído"}
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
   </div></button><button onClick={() => onAction("view", rows.indexOf(a))} className="text-sm font-medium text-primary hover:underline">Comissões</button>
<RowActions onView={() => onAction("edit", rows.indexOf(a))} onEdit={() => onAction("edit", rows.indexOf(a))} onDelete={() => onCancel(rows.indexOf(a), a.id)} deleteLabel="Cancelar" /></div>)}</div></section></main>;
}