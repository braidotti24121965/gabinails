"use client";
import { updateAppointmentRecord } from "@/lib/actions/appointments";

import { useState, useEffect } from "react";
import {
  Archive, ArrowRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, CircleDollarSign,
  ClipboardCheck, Clock3, CreditCard, Download, Gift, HeartHandshake, Home, Menu, MessageCircle,
  MoreHorizontal, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, TrendingUp,
  Eye, Pencil, Trash2, UserRound, Users, Wallet, WandSparkles, X, Database, Copy
} from "lucide-react";
import { appointments as demoAppointments, clients as demoClients, inventory, money, professionals as demoProfessionals, recovery, services as demoServices, type Appointment, type AppointmentStatus } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";
import { createClientRecord, updateClientRecord, archiveClientRecord, type ClientItem } from "@/lib/actions/clients";
import { createProfessionalRecord, updateProfessionalRecord, archiveProfessionalRecord, type ProfessionalItem } from "@/lib/actions/professionals";
import { createSpecialtyRecord } from "@/lib/actions/specialties";
import { createServiceRecord, type ServiceItem } from "@/lib/actions/services";
import { createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus } from "@/lib/actions/appointments";
import { finishAppointment } from "@/lib/actions/attendance";

type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "online";

const nav: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Painel", icon: Home }, { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clients", label: "Clientes", icon: Users }, { id: "services", label: "Serviços", icon: Sparkles },
  { id: "professionals", label: "Profissionais", icon: UserRound }, { id: "attendance", label: "Atendimentos", icon: ClipboardCheck },
  { id: "finance", label: "Financeiro", icon: Wallet }, { id: "inventory", label: "Estoque", icon: Package },
  { id: "automations", label: "Automações", icon: WandSparkles }, { id: "online", label: "Agendamento online", icon: ShoppingBag }
];

const titles: Record<View, [string, string]> = {
  dashboard: ["Bom dia, Gabi", "Acompanhe o ritmo do ateliê hoje."], agenda: ["Agenda", "Domingo, 14 de setembro de 2026"],
  clients: ["Clientes", "Relacionamento, histórico e recorrência."], services: ["Serviços", "Catálogo, preços e consumo de insumos."],
  professionals: ["Profissionais", "Equipe, jornadas e indicadores."], attendance: ["Atendimentos", "Conduza cada atendimento até o recebimento."],
  finance: ["Financeiro", "Faturamento, recebimentos, despesas e comissões."], inventory: ["Estoque", "Saldo por movimentação e previsão de consumo."],
  automations: ["Automações", "Comunicações programadas e receita recuperada."], online: ["Agendamento online", "Prévia do fluxo público para suas clientes."]
};

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const colors: Record<string, string> = { success: "bg-emerald-50 text-emerald-800", warning: "bg-amber-50 text-amber-800", danger: "bg-rose-50 text-rose-800", primary: "bg-primary-light text-primary", neutral: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-800" };
  return <span className={`badge ${colors[tone] ?? colors.neutral}`}>{children}</span>;
}

function statusTone(status: AppointmentStatus) {
  if (["Concluído", "Confirmado"].includes(status)) return "success";
  if (["Cancelado", "Não compareceu"].includes(status)) return "danger";
  if (["Aguardando sinal", "Pendente"].includes(status)) return "warning";
  if (["Cliente chegou", "Em atendimento"].includes(status)) return "primary";
  return "blue";
}

function Metric({ label, value, detail, icon: Icon, tone = "primary", onClick }: { label: string; value: string; detail: string; icon: typeof Home; tone?: string; onClick?: () => void }) {
  const content = <><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p></div><div className={`rounded-md p-2 ${tone === "danger" ? "bg-rose-50 text-danger" : tone === "warning" ? "bg-amber-50 text-warning" : "bg-primary-light text-primary"}`}><Icon size={18} strokeWidth={1.7} /></div></div><p className="mt-2 text-[11px] text-muted">{detail}</p></>;
  return onClick ? <button onClick={onClick} className="card min-w-0 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25">{content}</button> : <div className="card min-w-0">{content}</div>;
}

type EntityKind = "client" | "service" | "professional" | "product" | "automation" | "appointment" | "financial";
type EntityModalState = { kind: EntityKind; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string; fullItem?: any; };

const entityLabels: Record<EntityKind, string> = { client: "cliente", service: "serviço", professional: "profissional", product: "produto", automation: "automação", appointment: "agendamento", financial: "lançamento" };


function AppointmentModal({ mode, appointment, clients, professionals, services, close, save }: { mode: "view" | "edit"; appointment: any; clients: any[]; professionals: any[]; services: any[]; close: () => void; save: (id: string, rawData: any) => void }) {
  const [clientId, setClientId] = useState(appointment?.client_id || clients.find(c => c.name === appointment?.client)?.id || clients[0]?.id || "");
  const [profId, setProfId] = useState(appointment?.professional_id || professionals.find(p => p.name === appointment?.professional)?.id || professionals[0]?.id || "");
  
  // Try to parse services from the joined string or fallback to empty array (not perfect, but works for MVP since we don't have the full raw item easily available without refetching)
  const initialServiceNames = appointment?.service ? appointment.service.split(" + ") : [];
  const initialServiceIds = initialServiceNames.map((name: string) => services.find((s: any) => s.name === name)?.id).filter(Boolean);
  
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialServiceIds.length > 0 ? initialServiceIds : [services[0]?.id || ""]);
  
  // Date parsing
  // the 'time' is just HH:MM, date is not stored in demo Appointment struct cleanly, we'll just use today if unknown.
  // Actually, we need to extract date from the real db starts_at if we had it. For now, use today.
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState(appointment?.time || "09:00");
  const [submitting, setSubmitting] = useState(false);
  const readOnly = mode === "view";

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvcs = selectedServiceIds.map((id: string) => services.find((s: any) => s.id === id)).filter(Boolean);
  const totalDuration = selectedSvcs.reduce((acc: number, s: any) => acc + s.duration, 0);
  const totalPrice = selectedSvcs.reduce((acc: number, s: any) => acc + s.price, 0);

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 p-0 sm:items-center sm:p-4"><form onSubmit={async e => {
    e.preventDefault();
    if (!selectedClient || !selectedProf || selectedSvcs.length === 0) return;
    setSubmitting(true);
    await save(appointment.id, {
      clientId,
      professionalId: profId,
      services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),
      dateStr,
      timeStr,
      durationMinutes: totalDuration,
      price: totalPrice
    });
  }} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><Badge tone="primary">{mode === "view" ? "Detalhes" : "Editar Agendamento"}</Badge><h2 className="mt-2 text-lg font-semibold">{appointment?.client || "Agendamento"}</h2></div><button type="button" onClick={close} className="rounded-md p-2 text-muted hover:bg-bg"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label><span className="field-label">Cliente</span><select disabled={readOnly} value={clientId} onChange={e => setClientId(e.target.value)} className="field-input" required>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label><span className="field-label">Profissional</span><select disabled={readOnly} value={profId} onChange={e => setProfId(e.target.value)} className="field-input" required>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="sm:col-span-2 space-y-2"><span className="field-label">Serviços</span>
            {selectedServiceIds.map((srvId: string, index: number) => (
              <div key={index} className="flex gap-2">
                <select disabled={readOnly} value={srvId} onChange={e => {
                  const newIds = [...selectedServiceIds];
                  newIds[index] = e.target.value;
                  setSelectedServiceIds(newIds);
                }} className="field-input flex-1" required>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}
                </select>
                {selectedServiceIds.length > 1 && !readOnly && (
                  <button type="button" onClick={() => setSelectedServiceIds(selectedServiceIds.filter((_, i) => i !== index))} className="btn-outline !px-3 !min-h-0"><X size={16}/></button>
                )}
              </div>
            ))}
            {!readOnly && <button type="button" onClick={() => setSelectedServiceIds([...selectedServiceIds, services[0]?.id])} className="text-sm font-medium text-primary hover:underline">+ Adicionar outro serviço</button>}
          </div>
    <label><span className="field-label">Data</span><input disabled={readOnly} className="field-input" type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} required /></label>
    <label><span className="field-label">Horário</span><input disabled={readOnly} className="field-input" type="time" step="900" value={timeStr} onChange={e=>setTimeStr(e.target.value)} required /></label>
  </div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={close} className="btn-outline">{readOnly ? "Fechar" : "Cancelar"}</button>{!readOnly && <button disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Salvar alterações"}</button>}</div></form></div> }

function EntityModal({ state, close, save }: { state: EntityModalState; close: () => void; save: (name: string, detail: string) => void }) {
  const [name, setName] = useState(state.name); const [detail, setDetail] = useState(state.detail); const readOnly = state.mode === "view";
  const detailLabel = state.kind === "client" ? "WhatsApp" : state.kind === "service" || state.kind === "financial" ? "Valor" : state.kind === "professional" ? "Especialidade" : state.kind === "product" ? "Estoque atual" : state.kind === "automation" ? "Canal" : "Horário";
  


  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{state.mode === "create" ? "Novo cadastro" : state.mode === "view" ? "Detalhes" : "Edição"}</Badge><h2 className="mt-2 text-xl font-bold">{state.name || "Novo registro"}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4"><div><label className="field-label">Nome</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">{detailLabel}</label><input className="field-input" value={detail} onChange={e => setDetail(e.target.value)} disabled={readOnly} /></div><div><label className="field-label">Observações</label><textarea className="field-input h-24" placeholder="Informações adicionais do cadastro" disabled={readOnly} /></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button>{!readOnly && <button onClick={() => save(name, detail)} className="btn-primary"><Check size={16} />Salvar alterações</button>}</div></div></div>;
}

function ProfessionalModal({ mode, professional, specialtiesList = [], close, save }: { mode: "create" | "view" | "edit"; professional?: ProfessionalItem; specialtiesList?: {id: string, name: string}[]; close: () => void; save: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: professional?.name || "",
    email: professional?.email || "",
    phone: professional?.phone || "",
    specialties: professional?.specialty ? professional.specialty.split(",").map(s=>s.trim()).filter(Boolean) : [],
    default_commission: professional?.default_commission || 0,
    notes: professional?.notes || ""
  });
  const readOnly = mode === "view";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button onClick={close} className="absolute inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">{mode === "create" ? "Nova Profissional" : mode === "view" ? "Detalhes" : "Edição"}</Badge>
            <h2 className="mt-2 text-xl font-bold">{formData.name || "Profissional"}</h2>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Nome completo</label>
            <input className="field-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={readOnly} />
          </div>
          <div>
            <label className="field-label">Telefone / WhatsApp</label>
            <input className="field-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} disabled={readOnly} />
          </div>
          <div>
            <label className="field-label">E-mail</label>
            <input className="field-input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={readOnly} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label mb-2">Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {specialtiesList.map(s => {
                const active = formData.specialties.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      if (active) setFormData({ ...formData, specialties: formData.specialties.filter(x => x !== s.name) });
                      else setFormData({ ...formData, specialties: [...formData.specialties, s.name] });
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-primary bg-primary text-white" : "border-[#DBE3EC] bg-white text-ink hover:border-primary/50"}`}
                  >
                    {s.name}
                  </button>
                );
              })}
              {specialtiesList.length === 0 && <span className="text-xs text-muted">Nenhuma especialidade cadastrada.</span>}
              {!readOnly && (
                <button
                  type="button"
                  onClick={async () => {
                    const name = window.prompt("Nome da nova especialidade:");
                    if (name && name.trim()) {
                      const res = await createSpecialtyRecord(name.trim());
                      if (res.success && res.data) {
                         // We reload the page to get the updated specialties
                         window.location.reload();
                      }
                    }
                  }}
                  className="rounded-full border border-dashed border-[#DBE3EC] px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-primary transition"
                >
                  + Nova
                </button>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Comissão Padrão (%)</label>
            <input className="field-input" type="number" min="0" max="100" value={formData.default_commission} onChange={e => setFormData({ ...formData, default_commission: Number(e.target.value) })} disabled={readOnly} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Observações</label>
            <textarea className="field-input min-h-[80px]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} disabled={readOnly} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={close} className="btn-outline">Cancelar</button>
          {!readOnly && <button onClick={() => save(formData)} className="btn-primary"><Check size={16} />Salvar alterações</button>}
        </div>
      </div>
    </div>
  );
}

function RowActions({ onView, onEdit, onDelete, deleteLabel = "Excluir" }: { onView: () => void; onEdit: () => void; onDelete: () => void; deleteLabel?: string }) {
  return <div className="flex justify-end gap-1"><button onClick={onView} className="rounded-md p-2 text-muted hover:bg-primary-light hover:text-primary" title="Visualizar" aria-label="Visualizar"><Eye size={15} /></button><button onClick={onEdit} className="rounded-md p-2 text-muted hover:bg-primary-light hover:text-primary" title="Editar" aria-label="Editar"><Pencil size={15} /></button><button onClick={onDelete} className="rounded-md p-2 text-muted hover:bg-rose-50 hover:text-danger" title={deleteLabel} aria-label={deleteLabel}>{deleteLabel === "Arquivar" ? <Archive size={15} /> : <Trash2 size={15} />}</button></div>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-base font-semibold text-ink">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>{action}</div>;
}

function SmallMetricLink({ label, value, target, go }: { label: string; value: string; target: View; go: (view: View) => void }) {
  return <button onClick={() => go(target)} className="rounded-md border border-[#E7EDF3] p-3 text-left transition hover:border-primary/40 hover:bg-primary-light/40"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></button>;
}

function Header({ view, onMenu }: { view: View; onMenu: () => void }) {
  const configured = isSupabaseConfigured();
  return <header className="sticky top-0 z-30 flex min-h-[65px] items-center justify-between border-b border-[#DBE3EC] bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex min-w-0 items-center gap-3"><button onClick={onMenu} className="rounded-md p-2 text-muted hover:bg-bg lg:hidden" aria-label="Abrir menu"><Menu size={20} /></button><div className="min-w-0"><h1 className="truncate text-base font-semibold text-ink sm:text-lg">{titles[view][0]}</h1><p className="hidden text-xs text-muted sm:block">{titles[view][1]}</p></div></div><div className="flex items-center gap-2.5"><div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-[#DBE3EC] bg-[#F7F9FC]"><Database size={13} className={configured ? "text-emerald-600" : "text-amber-600"} /><span className="text-[11px] text-muted">{configured ? "Supabase Conectado" : "Modo Demonstração"}</span></div><button className="relative rounded-md border border-[#DBE3EC] p-2.5 text-muted hover:text-primary" aria-label="Notificações"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" /></button><div className="hidden items-center gap-2 border-l border-[#DBE3EC] pl-3 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">GL</div><div><p className="text-xs font-medium">Gabi Ludwig</p><p className="text-[10px] text-muted">Proprietária</p></div><ChevronDown size={14} className="text-muted" /></div></div></header>;
}

function Sidebar({ view, setView, open, close }: { view: View; setView: (v: View) => void; open: boolean; close: () => void }) {
  return <>{open && <button onClick={close} aria-label="Fechar menu" className="fixed inset-0 z-40 bg-navy-dark/40 lg:hidden" />}<aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(250px,calc(100vw-36px))] flex-col bg-navy text-white transition-transform lg:w-60 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[65px] items-center justify-between border-b border-white/10 px-5"><button onClick={() => setView("dashboard")} className="flex items-center gap-3 text-left"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary"><Sparkles size={16} /></div><div><span className="block text-sm font-semibold">Gabi Ludwig</span><span className="block text-[10px] text-white/55">Nail Studio</span></div></button><button onClick={close} className="text-white/70 lg:hidden"><X size={19} /></button></div><nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4"><p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[.12em] text-white/45">Operação</p>{nav.slice(0, 6).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] transition ${view === id ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} strokeWidth={1.5} />{label}</button>)}<p className="px-3 pb-2 pt-5 text-[10px] font-medium uppercase tracking-[.12em] text-white/45">Gestão</p>{nav.slice(6).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13.5px] transition ${view === id ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} strokeWidth={1.5} />{label}</button>)}</nav><div className="border-t border-white/10 p-3"><button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button><button onClick={() => logout()} className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-rose-400 transition-colors"><Trash2 size={16} />Sair do sistema</button></div></aside></>;
}

function Dashboard({ go, stats, onAttendance, appointments = [] }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void, appointments?: Appointment[] }) {
  return <main className="page-content space-y-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric onClick={() => go("agenda")} label="Agendamentos hoje" value={appointments.length.toString()} detail="Agendamentos para o dia" icon={CalendarDays} /><Metric onClick={() => go("finance")} label="Faturamento do dia" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Faturamento bruto" icon={TrendingUp} /><Metric onClick={() => go("finance")} label="Recebido hoje" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Recebimentos no caixa" icon={Wallet} /><Metric onClick={() => go("agenda")} label="Ocupação" value="—" detail="Disponível em breve" icon={Clock3} /></div><div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><section className="card"><SectionTitle title="Agenda de hoje" subtitle="Próximos horários e andamento" action={<button onClick={() => go("agenda")} className="btn-outline">Ver agenda <ArrowRight size={15} /></button>} /><div className="space-y-2">{appointments.slice(0, 4).map((a, i) => <button onClick={() => { if(a.status === "Em atendimento" || a.status === "Cliente chegou") { if (onAttendance) onAttendance(a); } else go("agenda"); }} key={a.id} className="flex w-full items-center gap-3 rounded-md border border-[#E7EDF3] p-3 text-left transition hover:border-primary/40 hover:bg-bg"><div className="w-12 shrink-0 text-center"><p className="text-sm font-semibold">{a.time}</p><p className="text-[10px] text-muted">{a.end}</p></div><div className={`h-10 w-1 rounded-full ${i === 0 ? "bg-primary" : i === 3 ? "bg-warning" : "bg-navy/25"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.client}</p><p className="truncate text-xs text-muted">{a.service} · {a.professional}</p></div><Badge tone={statusTone(a.status)}>{a.status}</Badge></button>)}</div></section><section className="card"><SectionTitle title="Próxima cliente" subtitle="Em 12 minutos" /><div className="rounded-md bg-primary-light p-4"><p className="text-sm text-center text-primary-dark">Nenhum atendimento próximo.</p></div><div className="mt-4 grid grid-cols-2 gap-3"><SmallMetricLink go={go} label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} target="finance" /><SmallMetricLink go={go} label="Ticket médio" value="—" target="finance" /><SmallMetricLink go={go} label="Clientes novas" value="—" target="clients" /><SmallMetricLink go={go} label="Taxa de retorno" value="—" target="clients" /></div></section></div><section className="card"><SectionTitle title="Clientes para recuperar" subtitle="Oportunidades priorizadas por manutenção e tempo sem atendimento" /><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Cliente</th><th>Motivo</th><th>Situação</th><th>Receita potencial</th><th className="text-right">Ações</th></tr></thead><tbody>{[].map((r: any) => <tr key={r.client}><td><button onClick={() => go("clients")} className="font-medium hover:text-primary">{r.client}</button></td><td><Badge tone={r.tone}>{r.reason}</Badge></td><td className="text-muted">{r.delay}</td><td className="font-medium">{money.format(r.value)}</td><td><div className="flex justify-end gap-2"><button onClick={() => go("automations")} className="btn-ghost !min-h-8 !px-3">Preparar mensagem</button><button onClick={() => go("agenda")} className="btn-outline !min-h-8 !px-3">Agendar</button></div></td></tr>)}</tbody></table></div></section></main>;
}

function Agenda({ rows, onNew, onAttendance, onAction, onCancel, onStatusChange }: { rows: Appointment[]; onNew: () => void; onAttendance: (a: Appointment) => void; onAction: (mode: "view" | "edit", index: number) => void; onCancel: (index: number, id: string) => void; onStatusChange: (a: Appointment, status: string) => void }) {
  return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-md border border-[#DBE3EC] bg-white p-1"><button className="rounded-sm bg-primary px-4 py-2 text-xs font-medium text-white">Dia</button><button className="px-4 py-2 text-xs text-muted">Semana</button><button className="px-4 py-2 text-xs text-muted">Mês</button></div><button onClick={onNew} className="btn-primary"><Plus size={16} />Novo agendamento</button></div><div className="mb-4 grid gap-3 sm:grid-cols-3"><select className="field-input" aria-label="Profissional"><option>Todas as profissionais</option>{demoProfessionals.map(p => <option key={p.name}>{p.name}</option>)}</select><select className="field-input" aria-label="Serviço"><option>Todos os serviços</option>{demoServices.map(s => <option key={s.name}>{s.name}</option>)}</select><select className="field-input" aria-label="Status"><option>Todos os status</option><option>Confirmado</option><option>Em atendimento</option><option>Aguardando sinal</option></select></div><section className="card !p-0 overflow-hidden"><div className="border-b border-[#E7EDF3] bg-[#F7F9FC] px-5 py-3 text-xs text-muted">08:00 — 19:00 · Intervalos de 15 minutos</div><div className="divide-y divide-[#E7EDF3]">{rows.map((a, index) => <div key={a.id} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-bg sm:px-5"><button onClick={a.status === "Em atendimento" || a.status === "Cliente chegou" ? () => onAttendance(a) : () => onAction("view", index)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className="w-14 shrink-0"><p className="font-semibold">{a.time}</p><p className="text-[10px] text-muted">{a.end}</p></div><div className="h-12 w-1 rounded-full bg-primary" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium">{a.client}</p>{a.source === "Online" && <Badge tone="blue">Online</Badge>}</div><p className="truncate text-xs text-muted">{a.service} · {a.professional}</p></div><div className="hidden text-right md:block"><p className="font-medium">{money.format(a.price)}</p><p className="text-[10px] text-muted">{a.paid ? `${money.format(a.paid)} recebido` : "Pagamento pendente"}</p></div><div className="hidden sm:block">
     <select 
       value={a.status}
       onClick={(e) => e.stopPropagation()} 
       onChange={(e) => onStatusChange(a, e.target.value)}
       className="field-input !py-1 !text-xs !h-8 w-32"
     >
       <option value="Aguardando sinal">Aguardando sinal</option>
       <option value="Agendado">Agendado</option>
       <option value="Confirmado">Confirmado</option>
       <option value="Cliente chegou">Cliente chegou</option>
       <option value="Em atendimento">Em atendimento</option>
       <option value="Concluído">Concluído</option>
     </select>
   </div></button><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onCancel(index, a.id)} deleteLabel="Cancelar" /></div>)}</div></section></main>;
}

function Clients({ data, onNew, onAction, onArchive }: { data: ClientItem[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onArchive: (index: number) => void }) { return <main className="page-content"><div className="mb-5 flex flex-wrap justify-between gap-3"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 text-muted" size={16} /><input className="field-input pl-9" placeholder="Buscar por nome ou telefone" /></div><button onClick={onNew} className="btn-primary"><Plus size={16} />Nova cliente</button></div><section className="card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Cliente</th><th>Última visita</th><th>Próxima manutenção</th><th>Atendimentos</th><th>Total gasto</th><th>Confiança</th><th>Status</th><th className="text-right">Ações</th></tr></thead><tbody>{data.map((c, index) => <tr key={c.name}><td><button onClick={() => onAction("view", index)} className="text-left hover:text-primary"><p className="font-medium">{c.name}</p><p className="text-[11px] text-muted">{c.phone}</p></button></td><td>{c.last}</td><td>{c.next}</td><td>{c.visits}</td><td>{money.format(c.spent)}</td><td>{c.whitelist ? <Badge tone="success"><ShieldCheck size={11} className="mr-1" />Sem sinal</Badge> : <span className="text-xs text-muted">Sinal obrigatório</span>}</td><td><Badge tone={c.status === "Ativa" ? "primary" : "neutral"}>{c.status}</Badge></td><td><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onArchive(index)} deleteLabel="Arquivar" /></td></tr>)}</tbody></table></div></section></main> }

function Services({ data, onNew, onAction, onDelete }: { data: any[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { return <main className="page-content"><div className="mb-5 flex justify-end"><button onClick={onNew} className="btn-primary"><Plus size={16} />Novo serviço</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((s, index) => <div className="card transition hover:border-primary/40" key={s.name}><button onClick={() => onAction("view", index)} className="w-full text-left"><div className="flex justify-between"><Badge tone="primary">{s.category}</Badge><Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Ativo" : "Inativo"}</Badge></div><h3 className="mt-4 font-semibold">{s.name}</h3><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E7EDF3] pt-4"><div><p className="text-[10px] text-muted">Duração</p><p className="mt-1 text-xs font-medium">{s.duration} min</p></div><div><p className="text-[10px] text-muted">Preço</p><p className="mt-1 text-xs font-medium">{money.format(s.price)}</p></div><div><p className="text-[10px] text-muted">Manutenção</p><p className="mt-1 text-xs font-medium">{s.maintenance ? `${s.maintenance} dias` : "—"}</p></div></div></button><div className="mt-3 border-t border-[#E7EDF3] pt-2"><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} /></div></div>)}</div></main> }

function Professionals({ data, onNew, onAction, onDelete }: { data: ProfessionalItem[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { return <main className="page-content"><div className="mb-5 flex justify-end"><button onClick={onNew} className="btn-primary"><Plus size={16} />Nova profissional</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((p, index) => <div className="card" key={p.name}><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{p.initials}</div><div><h3 className="font-semibold">{p.name}</h3><p className="text-xs text-muted">{p.specialty}</p></div></div><div className="mt-5 space-y-3 border-t border-[#E7EDF3] pt-4"><div className="flex justify-between text-xs"><span className="text-muted">Atendimentos hoje</span><span className="font-semibold">{p.today}</span></div><div className="flex justify-between text-xs"><span className="text-muted">Produção mensal</span><span className="font-semibold">{money.format(p.production)}</span></div><div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-muted">Ocupação</span><span className="font-semibold">{p.occupation}%</span></div><div className="h-1.5 w-full rounded-full bg-[#E7EDF3]"><div className="h-full rounded-full bg-primary" style={{ width: `${p.occupation}%` }} /></div></div><div className="flex justify-between pt-1 text-xs"><span className="text-muted">Comissão gerada</span><span className="font-semibold">{money.format(p.commission)}</span></div></div><div className="mt-4 border-t border-[#E7EDF3] pt-2"><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} deleteLabel="Arquivar" /></div></div>)}</div></main> }

function Attendance({ appointment, onFinish }: { appointment: Appointment | null; onFinish: () => void }) { 
    const [extra, setExtra] = useState(false); 
    if (!appointment) return <div className="p-8 text-center">Nenhum atendimento selecionado</div>;
    return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="primary">{appointment.status}</Badge><p className="mt-2 text-xs text-muted">Horário agendado: {appointment.time}</p></div><button onClick={onFinish} className="btn-primary"><Check size={16} />Concluir atendimento</button></div><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="card"><SectionTitle title={appointment.client} subtitle={appointment.phone} /><div className="rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{appointment.service}</p><p className="text-xs text-muted">{appointment.professional}</p></div><p className="font-semibold">{money.format(appointment.price)}</p></div></div>{extra && <div className="mt-2 rounded-md border border-[#E7EDF3] p-4"><div className="flex justify-between"><div><p className="font-medium">Nail art premium</p><p className="text-xs text-muted">{appointment.professional} · adicional</p></div><p className="font-semibold">R$ 50,00</p></div></div>}<button onClick={() => setExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button><div className="mt-6"><label className="field-label">Observações do atendimento</label><textarea className="field-input h-24 py-2.5" placeholder="Preferências, intercorrências ou detalhes..." /></div><div className="mt-5 rounded-md border border-dashed border-[#C8D5E3] p-5 text-center"><Sparkles className="mx-auto text-primary" size={20} /><p className="mt-2 text-xs font-medium">Fotos antes e depois</p><p className="text-[11px] text-muted">Anexe imagens ao histórico desta cliente</p><button className="btn-outline mt-3 !min-h-8">Adicionar fotos</button></div></section><aside className="card h-fit"><SectionTitle title="Resumo financeiro" /><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">Serviços</span><span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(extra ? appointment.price + 50 : appointment.price)}</span></div></div><div className="mt-5 rounded-md bg-bg p-3 text-xs text-muted"><p className="font-medium text-ink">Ao concluir</p><p className="mt-1">Comissão calculada e estoque baixado.</p></div></aside></div></main> }

const initialFinancialRows = [{ date: "14/09 09:12", name: "Mariana Costa", type: "Recebimento", method: "PIX", status: "Pago", value: 185 }, { date: "14/09 08:40", name: "Compra de materiais", type: "Despesa", method: "Crédito", status: "Pendente", value: -428 }, { date: "13/09 18:05", name: "Luiza Torres", type: "Sinal", method: "PIX", status: "Pago", value: 30 }];
function Finance({ data, stats, onNew, onAction, onReverse }: { data: any[]; stats?: any; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onReverse: (index: number) => void }) { return <main className="page-content space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Mês atual" icon={TrendingUp} /><Metric label="Recebimentos" value={stats ? money.format(stats.revenue) : "R$ 0,00"} detail="Soma de pagamentos" icon={CircleDollarSign} /><Metric label="Despesas" value={stats ? money.format(stats.expenses) : "R$ 0,00"} detail="Contas do mês" icon={CreditCard} tone="warning" /><Metric label="Resultado estimado" value={stats ? money.format(stats.balance) : "R$ 0,00"} detail="Após despesas e comissões" icon={BarChart3} /></div><section className="card"><SectionTitle title="Saúde do negócio" subtitle="Setembro de 2026" action={<button className="btn-outline"><Download size={15} />Exportar</button>} /><div className="grid gap-4 md:grid-cols-3"><div className="rounded-md bg-bg p-4"><p className="text-xs text-muted">Comissões geradas</p><p className="mt-1 text-xl font-semibold">{stats ? money.format(stats.commissions) : "R$ 0,00"}</p><Badge tone="warning">A fechar</Badge></div><div className="rounded-md bg-bg p-4"><p className="text-xs text-muted">Valores pendentes</p><p className="mt-1 text-xl font-semibold">R$ 0,00</p><Badge tone="danger">0 cobranças</Badge></div><div className="rounded-md bg-bg p-4"><p className="text-xs text-muted">Recorrência</p><p className="mt-1 text-xl font-semibold">--%</p><Badge tone="neutral">Mês atual</Badge></div></div></section><section className="card"><SectionTitle title="Movimentos recentes" action={<button onClick={onNew} className="btn-primary"><Plus size={15} />Novo lançamento</button>} /><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Data</th><th>Cliente/Descrição</th><th>Tipo</th><th>Forma</th><th>Status</th><th>Valor</th><th className="text-right">Ações</th></tr></thead><tbody>{data.map((item, index) => <tr key={`${item.date}-${item.name}`}><td>{item.date}</td><td><button onClick={() => onAction("view", index)} className="font-medium hover:text-primary">{item.name}</button></td><td>{item.type}</td><td>{item.method}</td><td><Badge tone={item.status === "Pago" ? "success" : item.status === "Estornado" ? "danger" : "warning"}>{item.status}</Badge></td><td className={`font-medium ${item.value >= 0 ? "text-primary" : "text-danger"}`}>{money.format(item.value)}</td><td><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onReverse(index)} deleteLabel="Estornar" /></td></tr>)}</tbody></table></div></section></main> }

function Inventory({ data, onNew, onAction, onDelete }: { data: typeof inventory; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { return <main className="page-content"><div className="mb-5 flex flex-wrap justify-between gap-3"><div className="flex gap-2"><Badge tone="danger">2 abaixo do mínimo</Badge><Badge tone="warning">3 com déficit previsto</Badge></div><button onClick={onNew} className="btn-primary"><Plus size={16} />Novo produto / movimento</button></div><section className="card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Produto</th><th>Saldo atual</th><th>Mínimo / Ideal</th><th>Demanda futura</th><th>Previsão</th><th>Custo unitário</th><th className="text-right">Ações</th></tr></thead><tbody>{data.map((i, index) => { const deficit = i.stock - i.forecast; return <tr key={i.product}><td><button onClick={() => onAction("view", index)} className="font-medium hover:text-primary">{i.product}</button></td><td>{i.stock} {i.unit}</td><td>{i.minimum} / {i.ideal} {i.unit}</td><td>{i.forecast} {i.unit}</td><td>{deficit < 0 ? <Badge tone="danger">Déficit de {Math.abs(deficit)} {i.unit}</Badge> : <Badge tone="success">Suficiente</Badge>}</td><td>{money.format(i.cost)}</td><td><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} /></td></tr>})}</tbody></table></div></section><div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Previsão de consumo</p><p className="mt-1 text-xs">Os próximos agendamentos exigem 42 lixas; o estoque atual é 30. Inclua 12 unidades na lista de reposição.</p></div></main> }

const initialTemplates = [{ name: "Lembrete 24h", count: "18 agendadas", tone: "success" }, { name: "Sinal pendente", count: "3 aguardando", tone: "warning" }, { name: "Manutenção vencida", count: "7 oportunidades", tone: "danger" }, { name: "Aniversário", count: "2 nesta semana", tone: "primary" }];
function Automations({ data, onNew, onAction, onDelete, go }: { data: typeof initialTemplates; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void; go: (v: View) => void }) { return <main className="page-content"><div className="grid gap-4 sm:grid-cols-3"><Metric onClick={() => go("automations")} label="Mensagens simuladas" value="184" detail="Últimos 30 dias" icon={MessageCircle} /><Metric onClick={() => go("agenda")} label="Agendamentos recuperados" value="23" detail="Origem atribuída à automação" icon={HeartHandshake} /><Metric onClick={() => go("finance")} label="Receita recuperada" value="R$ 3.420" detail="10,7% do faturamento mensal" icon={Gift} /></div><section className="mt-6"><SectionTitle title="Automações ativas" subtitle="Provider em modo simulação" action={<button onClick={onNew} className="btn-primary"><Plus size={16} />Nova automação</button>} /><div className="grid gap-4 sm:grid-cols-2">{data.map((t, index) => <div key={t.name} className="card"><button onClick={() => onAction("view", index)} className="flex w-full items-center justify-between text-left"><div><p className="font-medium">{t.name}</p><p className="mt-1 text-xs text-muted">WhatsApp · Template aprovado</p></div><Badge tone={t.tone}>{t.count}</Badge></button><div className="mt-3 border-t border-[#E7EDF3] pt-2"><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} /></div></div>)}</div></section><section className="card mt-6"><SectionTitle title="Fila de mensagens" /><div className="space-y-2">{["Clara Martins · confirmação", "Fernanda Lima · sinal pendente", "Isabela Moraes · manutenção vencida"].map((x, i) => <button onClick={() => onAction("view", Math.min(i, data.length - 1))} key={x} className="flex w-full items-center justify-between rounded-md border border-[#E7EDF3] p-3 text-left hover:border-primary/40"><div><p className="text-sm font-medium">{x}</p><p className="text-[11px] text-muted">Hoje, {10 + i}:00 · Canal WhatsApp simulado</p></div><Badge tone={i === 0 ? "success" : "warning"}>{i === 0 ? "Enviada" : "Agendada"}</Badge></button>)}</div></section></main> }

function OnlineBooking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(demoServices[0]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-09-15");
  const [slots, setSlots] = useState<string[]>(["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submittingHold, setSubmittingHold] = useState(false);
  const [holdData, setHoldData] = useState<{ holdExpiresAt: string; holdMinutes: number } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Checa Whitelist pelo telefone digitado (estado derivado)
  const cleanPhone = clientPhone.replace(/\D/g, "");
  const isWhitelisted = cleanPhone.length >= 8 && Boolean(demoClients.find(c => c.phone.replace(/\D/g, "").includes(cleanPhone) && c.whitelist));

  const loadSlots = (date: string, duration: number) => {
    setLoadingSlots(true);
    fetch(`/api/booking/availability?date=${date}&duration=${duration}`)
      .then(res => res.json())
      .then(data => {
        if (data.availableSlots && data.availableSlots.length > 0) {
          setSlots(data.availableSlots);
        } else {
          setSlots(["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"]);
        }
      })
      .catch(() => {
        setSlots(["09:00", "10:30", "13:30", "15:00", "16:30", "18:00"]);
      })
      .finally(() => setLoadingSlots(false));
  };

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingHold(true);
    try {
      const res = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          date: selectedDate,
          time: selectedTime,
          durationMinutes: selectedService.duration,
        })
      });
      const data = await res.json();
      setHoldData({
        holdExpiresAt: data.holdExpiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        holdMinutes: data.holdMinutes || 30
      });
      setStep(5);
    } catch {
      setHoldData({
        holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        holdMinutes: 30
      });
      setStep(5);
    } finally {
      setSubmittingHold(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard?.writeText("00020126360014BR.GOV.BCB.PIX0114gabi.ludwig.pix520400005303986540530.005802BR5917Gabi Ludwig Nails6009Porto Alegre62070503***6304E8A2");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <main className="page-content">
      <div className="mx-auto max-w-md overflow-hidden rounded-lg border border-[#DBE3EC] bg-white shadow-card">
        <div className="bg-navy px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Sparkles size={17} />
            </div>
            <div>
              <p className="font-semibold">Gabi Ludwig Nail Studio</p>
              <p className="text-xs text-white/60">Agendamento online oficial</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-5 pt-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-slate-100"}`} />
          ))}
        </div>

        <div className="p-5">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">Qual serviço você deseja?</h2>
              <p className="mt-1 text-xs text-muted">Escolha um procedimento para ver a disponibilidade.</p>
              <div className="mt-5 space-y-2">
                {demoServices.map(s => (
                  <button
                    onClick={() => { setSelectedService(s); setStep(2); }}
                    key={s.name}
                    className="flex w-full items-center justify-between rounded-md border border-[#DBE3EC] p-3.5 text-left transition hover:border-primary hover:bg-primary-light/20"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted">{s.duration} min · {s.category}</p>
                    </div>
                    <p className="font-semibold text-primary">{money.format(s.price)}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Com quem prefere?</h2>
                <button onClick={() => setStep(1)} className="text-xs text-primary underline">Voltar</button>
              </div>
              <div className="mt-5 space-y-2">
                <button
                  onClick={() => { setSelectedProfessional(null); setStep(3); loadSlots(selectedDate, selectedService.duration); }}
                  className="w-full rounded-md border border-primary bg-primary-light/40 p-3.5 text-left transition hover:bg-primary-light"
                >
                  <p className="font-medium text-primary">Primeira profissional disponível</p>
                  <p className="text-xs text-muted">Maior flexibilidade de horários</p>
                </button>
                {demoProfessionals.map(p => (
                  <button
                    onClick={() => { setSelectedProfessional(p.name); setStep(3); loadSlots(selectedDate, selectedService.duration); }}
                    key={p.name}
                    className="flex w-full items-center gap-3 rounded-md border border-[#DBE3EC] p-3 text-left transition hover:border-primary"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                      {p.initials}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.specialty}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Data e horário</h2>
                <button onClick={() => setStep(2)} className="text-xs text-primary underline">Voltar</button>
              </div>
              <label className="mt-4 block">
                <span className="field-label">Data desejada</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    loadSlots(newDate, selectedService.duration);
                  }}
                  className="field-input"
                  min="2026-09-14"
                />
              </label>

              <p className="mt-4 text-xs font-medium text-muted">Horários disponíveis para {selectedService.duration} min:</p>

              {loadingSlots ? (
                <div className="mt-4 py-8 text-center text-xs text-muted">Calculando disponibilidade em tempo real...</div>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {slots.map(h => (
                    <button
                      onClick={() => { setSelectedTime(h); setStep(4); }}
                      key={h}
                      className="btn-outline !min-h-10 hover:border-primary hover:bg-primary hover:text-white"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 rounded-md bg-bg p-3 text-[11px] text-muted">
                Slots calculados em intervalos de 15 minutos com prevenção de conflitos via Postgres.
              </div>
            </>
          )}

          {step === 4 && (
            <form onSubmit={handleCreateHold}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Seus dados</h2>
                <button type="button" onClick={() => setStep(3)} className="text-xs text-primary underline">Voltar</button>
              </div>

              <div className="mt-4 rounded-md bg-primary-light/40 p-3 text-xs">
                <p className="font-semibold text-primary">{selectedService.name}</p>
                <p className="text-muted">{selectedDate} às {selectedTime} · {selectedProfessional || "Primeira disponível"}</p>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="field-label">Seu nome completo</span>
                  <input
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="field-input"
                    placeholder="Ex: Mariana Costa"
                  />
                </label>

                <label className="block">
                  <span className="field-label">WhatsApp (com DDD)</span>
                  <input
                    required
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="field-input"
                    placeholder="(51) 99999-9999"
                  />
                </label>
              </div>

              {isWhitelisted ? (
                <div className="mt-4 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cliente VIP reconhecida!</p>
                    <p>Seu perfil possui isenção de sinal. Sua vaga será confirmada imediatamente.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                  <b>Sinal de reserva: R$ 30,00</b>
                  <p className="mt-0.5">O sinal garante exclusividade do seu horário e é descontado do valor total no atendimento.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingHold || !clientName || !clientPhone}
                className="btn-primary mt-5 w-full"
              >
                {submittingHold ? "Garantindo vaga..." : "Reservar horário"}
              </button>
            </form>
          )}

          {step === 5 && (
            <div>
              <div className="rounded-md border border-primary bg-primary-light/30 p-4 text-center">
                <Clock3 size={24} className="mx-auto text-primary" />
                <h3 className="mt-2 text-base font-semibold text-primary">Horário reservado com exclusividade</h3>
                <p className="mt-1 text-xs text-muted">
                  Sua vaga está protegida contra sobreposição por <b>{holdData?.holdMinutes || 30} minutos</b>.
                </p>
              </div>

              {!isWhitelisted ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-[#DBE3EC] p-3.5 bg-surface">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Valor do sinal</span>
                      <span className="font-semibold text-ink">R$ 30,00</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-muted">Saldo restante no dia</span>
                      <span className="font-semibold text-ink">{money.format(selectedService.price - 30)}</span>
                    </div>
                  </div>

                  <div className="rounded-md bg-bg p-3">
                    <p className="text-[11px] font-medium text-muted uppercase">Chave PIX para confirmação</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded border border-[#DBE3EC] bg-white px-3 py-2 text-xs">
                      <span className="truncate font-mono">pix@gabiludwig.com.br</span>
                      <button onClick={copyPix} type="button" className="text-primary hover:text-primary-dark">
                        {copiedPix ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {copiedPix && <p className="mt-1 text-[11px] text-emerald-600">Chave copiada para a área de transferência!</p>}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-md bg-emerald-50 p-3.5 text-xs text-emerald-800">
                  <p className="font-medium">Nenhum pagamento antecipado é necessário para você.</p>
                </div>
              )}

              <button onClick={() => setStep(6)} className="btn-primary mt-5 w-full">
                <Check size={15} /> Finalizar agendamento
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Agendamento Realizado!</h2>
              <p className="mt-1 text-xs text-muted">
                {selectedService.name} · {selectedDate} às {selectedTime}
              </p>
              <div className="mt-4 rounded-md bg-bg p-3 text-xs text-left space-y-1 text-muted">
                <p><b>Cliente:</b> {clientName}</p>
                <p><b>Profissional:</b> {selectedProfessional || "Equipe Gabi Ludwig"}</p>
                <p><b>Confirmação:</b> Notificação enviada para o WhatsApp {clientPhone}</p>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setClientName("");
                  setClientPhone("");
                  setSelectedTime("");
                }}
                className="btn-primary mt-5"
              >
                Novo agendamento
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function BookingModal({ clients, professionals, services, close, save }: { clients: any[]; professionals: any[]; services: any[]; close: () => void; save: (a: Appointment, rawData?: any) => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [profId, setProfId] = useState(professionals[0]?.id || "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([services[0]?.id || ""]);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProf = professionals.find(p => p.id === profId);
  const selectedSvcs = selectedServiceIds.map((id: string) => services.find((s: any) => s.id === id)).filter(Boolean);
  const totalDuration = selectedSvcs.reduce((acc: number, s: any) => acc + s.duration, 0);
  const totalPrice = selectedSvcs.reduce((acc: number, s: any) => acc + s.price, 0);
  const serviceNames = selectedSvcs.map((s: any) => s.name).join(" + ");

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 p-0 sm:items-center sm:p-4"><form onSubmit={async e => {
    e.preventDefault();
    if (!selectedClient || !selectedProf || selectedSvcs.length === 0) return;
    setSubmitting(true);
    await save({
      id: `temp-${Date.now()}`,
      time: timeStr,
      end: "—",
      client: selectedClient.name,
      phone: selectedClient.phone,
      professional: selectedProf.name,
      service: serviceNames,
      status: "Aguardando sinal",
      price: totalPrice,
      source: "Interno"
    }, {
      clientId,
      professionalId: profId,
      services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),
      dateStr,
      timeStr,
      durationMinutes: totalDuration,
      price: totalPrice
    });
  }} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Novo agendamento</h2><p className="text-xs text-muted">Selecione os dados reais do banco.</p></div><button type="button" onClick={close} className="rounded-md p-2 text-muted hover:bg-bg"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label><span className="field-label">Cliente</span><select value={clientId} onChange={e => setClientId(e.target.value)} className="field-input" required>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label><span className="field-label">Profissional</span><select value={profId} onChange={e => setProfId(e.target.value)} className="field-input" required>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="sm:col-span-2 space-y-2"><span className="field-label">Serviços</span>
            {selectedServiceIds.map((srvId: string, index: number) => (
              <div key={index} className="flex gap-2">
                <select value={srvId} onChange={e => {
                  const newIds = [...selectedServiceIds];
                  newIds[index] = e.target.value;
                  setSelectedServiceIds(newIds);
                }} className="field-input flex-1" required>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.duration} min - R$ {s.price})</option>)}
                </select>
                {selectedServiceIds.length > 1 && (
                  <button type="button" onClick={() => setSelectedServiceIds(selectedServiceIds.filter((_, i) => i !== index))} className="btn-outline !px-3 !min-h-0"><X size={16}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setSelectedServiceIds([...selectedServiceIds, services[0]?.id])} className="text-sm font-medium text-primary hover:underline">+ Adicionar outro serviço</button>
          </div>
    <label><span className="field-label">Data</span><input className="field-input" type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} required /></label>
    <label><span className="field-label">Horário</span><input className="field-input" type="time" step="900" value={timeStr} onChange={e=>setTimeStr(e.target.value)} required /></label>
  </div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={close} className="btn-outline">Cancelar</button><button disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Criar agendamento"}</button></div></form></div> }


function ServiceModal({ mode, service, close, save }: { mode: "create" | "view" | "edit"; service?: ServiceItem; close: () => void; save: (data: Omit<ServiceItem, 'id' | 'active'>) => void }) {
  const [formData, setFormData] = useState({
    name: service?.name || "",
    category: service?.category || "Geral",
    duration: service?.duration || 60,
    price: service?.price || 0,
    maintenance: service?.maintenance || 0
  });
  const readOnly = mode === "view";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <button onClick={close} className="fixed inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">{mode === "create" ? "Novo Serviço" : mode === "view" ? "Detalhes do Serviço" : "Editar Serviço"}</Badge>
            <h2 className="mt-2 text-xl font-bold">{formData.name || "Novo Serviço"}</h2>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>
        
        <form onSubmit={e => {
          e.preventDefault();
          save(formData);
        }}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Nome do Serviço *</label>
              <input required className="field-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Categoria</label>
                <input className="field-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Preço (R$) *</label>
                <input required type="number" step="0.01" min="0" className="field-input" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Duração (minutos) *</label>
                <input required type="number" min="1" className="field-input" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} disabled={readOnly} />
              </div>
              <div>
                <label className="field-label">Manutenção sugerida (dias)</label>
                <input type="number" min="0" className="field-input" value={formData.maintenance || ''} onChange={e => setFormData({...formData, maintenance: Number(e.target.value)})} disabled={readOnly} placeholder="0 = Sem manutenção" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={close} className="btn-outline">Cancelar</button>
            {!readOnly && <button type="submit" className="btn-primary"><Check size={16} />Salvar serviço</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

function FinishModal({ appointment, close, done }: { appointment: Appointment; close: () => void; done: (method: string, val: number) => void }) { 
    const [method, setMethod] = useState("PIX"); 
    const [submitting, setSubmitting] = useState(false);
    return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-dark/45 sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg"><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Concluir atendimento</h2><p className="text-xs text-muted">Revise o recebimento de {appointment.client}.</p></div><button onClick={close}><X size={18} /></button></div><div className="mt-5 rounded-md bg-bg p-4"><div className="flex justify-between"><span>Total do atendimento</span><b>{money.format(appointment.price)}</b></div><div className="mt-3 flex justify-between border-t border-[#DBE3EC] pt-3 text-base"><b>A receber</b><b>{money.format(appointment.price)}</b></div></div><label className="mt-4 block"><span className="field-label">Forma de pagamento</span><select value={method} onChange={e => setMethod(e.target.value)} className="field-input"><option>PIX</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option></select></label><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Comissão gerada</p><b>{money.format(appointment.price * 0.3)}</b></div><div className="rounded-md border border-[#DBE3EC] p-3"><p className="text-muted">Status do sistema</p><b>Caixa aberto</b></div></div><button disabled={submitting} onClick={async () => { setSubmitting(true); await done(method, appointment.price); }} className="btn-primary mt-5 w-full"><Check size={16} />{submitting ? "Processando..." : "Confirmar e concluir"}</button></div></div> }

function Toast({ text }: { text: string }) { return <div className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-md bg-navy-dark px-4 py-3 text-sm text-white shadow-xl"><div className="rounded-full bg-primary p-1"><Check size={12} /></div>{text}</div> }

export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = [], initialServices = demoServices as any[], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 } }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialFinancials?: any[]; initialStats?: any }) {
  const [view, setView] = useState<View>("dashboard"); const [menu, setMenu] = useState(false); const [booking, setBooking] = useState(false); const [finish, setFinish] = useState(false); const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null); const [toast, setToast] = useState(""); const [rows, setRows] = useState(initialAppointments);
  const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...initialServices]);
  const [professionalRows, setProfessionalRows] = useState(() => [...initialProfessionals]); const [productRows, setProductRows] = useState(() => [...inventory]);
  const [automationRows, setAutomationRows] = useState(() => [...initialTemplates]); const [specialtyList, setSpecialtyList] = useState(() => [...initialSpecialties]); const [financialRows, setFinancialRows] = useState(() => [...initialFinancials]); const [entityModal, setEntityModal] = useState<EntityModalState | null>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };
  const openEntity = (kind: EntityKind, mode: "view" | "edit" | "create", index?: number) => {
    if (mode === "create") { setEntityModal({ kind, mode, name: "", detail: kind === "service" ? "R$ 0,00" : "" }); return; }
    if (index === undefined) return;
    if (kind === "client") { const item = clientRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.phone }); }
    if (kind === "service") { const item = serviceRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.duration.toString() }); }
    if (kind === "professional") { const item = professionalRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: item.specialty }); }
    if (kind === "product") { const item = productRows[index]; setEntityModal({ kind, mode, index, name: item.product, detail: `${item.stock} ${item.unit}` }); }
    if (kind === "automation") { const item = automationRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: "WhatsApp" }); }
    if (kind === "appointment") { const item = rows[index]; setEntityModal({ kind, mode, index, name: item.client, detail: item.time, fullItem: item }); }
    if (kind === "financial") { const item = financialRows[index]; setEntityModal({ kind, mode, index, name: item.name, detail: money.format(Math.abs(item.value)) }); }
  };
  const saveEntity = async (name: string, detail: string) => {
    if (!entityModal) return; const { kind, mode, index } = entityModal; const creating = mode === "create";
    if (kind === "client") {
      if (creating) {
        const res = await createClientRecord({ name, phone: detail });
        if (res.success) setClientRows(current => [...current, { id: res.data?.id, name, phone: detail, last: "—", next: "—", visits: 0, spent: 0, status: "Ativa", whitelist: false, tag: "Nova" }]);
      } else if (index !== undefined) {
        const item = clientRows[index];
        if (item.id) await updateClientRecord(item.id, { name, phone: detail });
        setClientRows(current => current.map((c, i) => i === index ? { ...c, name, phone: detail } : c));
      }
    }
    if (kind === "service") { 
    if (creating) {
      const res = await createServiceRecord({ name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0 });
      if (res.success) setServiceRows(current => [...current, { id: res.data?.id || "tmp", name, category: "Geral", duration: parseInt(detail) || 60, price: 100, maintenance: 0, active: true }]);
    }
  }
    if (kind === "professional") setProfessionalRows(current => creating ? [...current, { name, initials: name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase(), specialty: detail, today: 0, production: 0, occupation: 0, commission: 0 }] : current.map((item, i) => i === index ? { ...item, name, specialty: detail } : item));
    if (kind === "product") { const stock = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0; setProductRows(current => creating ? [...current, { product: name, unit: "un", stock, minimum: 10, ideal: 30, forecast: 0, cost: 0 }] : current.map((item, i) => i === index ? { ...item, product: name, stock } : item)); }
    if (kind === "automation") setAutomationRows(current => creating ? [...current, { name, count: "0 agendadas", tone: "primary" }] : current.map((item, i) => i === index ? { ...item, name } : item));
    if (kind === "appointment" && index !== undefined) setRows(current => current.map((item, i) => i === index ? { ...item, client: name, time: detail } : item));
    if (kind === "financial") { const value = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0; setFinancialRows(current => creating ? [...current, { date: "Hoje", name, type: "Despesa", method: "PIX", status: "Pendente", value: -value }] : current.map((item, i) => i === index ? { ...item, name, value: item.value < 0 ? -value : value } : item)); }
    setEntityModal(null); notify(creating ? "Cadastro criado com sucesso." : "Alterações salvas com sucesso.");
  };
  const saveService = async (data: any) => {
    if (!entityModal) return;
    if (entityModal.mode === "create") {
      const res = await createServiceRecord(data);
      if (res.success) {
        setServiceRows(current => [...current, { ...data, id: res.data?.id || "tmp", active: true }]);
        notify("Serviço salvo com sucesso.");
      } else {
        alert(res.error);
      }
    } else {
      // optimistic edit (no backend update yet, just for UI)
      setServiceRows(current => current.map((item, i) => i === entityModal.index ? { ...item, ...data } : item));
      notify("Serviço salvo com sucesso (local).");
    }
    setEntityModal(null);
  };
  const saveProfessional = async (formData: any) => {
    if (!entityModal) return;
    const { mode, index } = entityModal;
    const creating = mode === "create";
    
    const dataToSave = { ...formData, specialty: formData.specialties.join(", "), specialties: formData.specialties };

    if (creating) {
      const res = await createProfessionalRecord(dataToSave);
      if (res.success && res.data) {
        setProfessionalRows(current => [...current, {
          id: res.data.id,
          name: formData.name,
          initials: formData.name.split(" ").map((p: string) => p[0]).join("").slice(0,2).toUpperCase(),
          specialty: formData.specialty,
          email: formData.email,
          phone: formData.phone,
          default_commission: formData.default_commission,
          notes: formData.notes,
          today: 0, production: 0, occupation: 0, commission: 0
        }]);
      }
    } else if (index !== undefined) {
      const item = professionalRows[index];
      if (item.id) await updateProfessionalRecord(item.id, dataToSave);
      setProfessionalRows(current => current.map((p, i) => i === index ? {
        ...p,
        name: formData.name,
        specialty: formData.specialty,
        email: formData.email,
        phone: formData.phone,
        default_commission: formData.default_commission,
        notes: formData.notes
      } : p));
    }
    
    setEntityModal(null);
    notify(creating ? "Profissional criada com sucesso." : "Alterações salvas com sucesso.");
  };

  const confirmAction = (message: string, action: () => void) => { if (window.confirm(message)) action(); };
  const content = (() => {
    if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} appointments={rows} onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }} />;
    if (view === "agenda") return <Agenda rows={rows} onNew={() => setBooking(true)} onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }} onAction={(mode, index) => openEntity("appointment", mode, index)} onStatusChange={async (a, statusUI) => {
    if (statusUI === "Concluído") {
      // Intercept to open payment/checkout modal
      setActiveAppointment(a);
      setFinish(true);
      return;
    }

    const map: Record<string, string> = {
      "Aguardando sinal": "awaiting_deposit",
      "Agendado": "scheduled",
      "Confirmado": "confirmed",
      "Cliente chegou": "arrived",
      "Em atendimento": "in_progress",
      "Concluído": "completed"
    };
    const dbStatus = map[statusUI];
    if (dbStatus) {
      setRows(current => current.map(item => item.id === a.id ? { ...item, status: statusUI as any } : item));
      updateAppointmentStatus(a.id, dbStatus); // Don't block UI waiting for this
      
      if (statusUI === "Em atendimento" || statusUI === "Cliente chegou") {
        setActiveAppointment(a);
        setView("attendance");
      }
    }
  }}
  onCancel={(index, id) => confirmAction("Cancelar este agendamento? O histórico será preservado.", () => { cancelAppointmentRecord(id).then(res => { if(res.success) { setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado."); } else alert(res.error); }) })} />;
    if (view === "clients") return <Clients data={clientRows} onNew={() => openEntity("client", "create")} onAction={(mode, index) => openEntity("client", mode, index)} onArchive={index => confirmAction("Arquivar esta cliente? O histórico será preservado.", async () => { const item = clientRows[index]; if (item.id) await archiveClientRecord(item.id); setClientRows(current => current.map((c, i) => i === index ? { ...c, status: "Inativa" } : c)); notify("Cliente arquivada; histórico preservado."); })} />;
    if (view === "services") return <Services data={serviceRows} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço da demonstração?", () => { setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço removido."); })} />;
    if (view === "professionals") return <Professionals data={professionalRows} onNew={() => openEntity("professional", "create")} onAction={(mode, index) => openEntity("professional", mode, index)} onDelete={index => confirmAction("Arquivar esta profissional? Agendamentos anteriores serão preservados.", async () => { const item = professionalRows[index]; if (item.id) await archiveProfessionalRecord(item.id); setProfessionalRows(current => current.filter((_, i) => i !== index)); notify("Profissional arquivada."); })} />;
    if (view === "attendance") return <Attendance appointment={activeAppointment} onFinish={() => setFinish(true)} />; if (view === "finance") return <Finance stats={initialStats} data={financialRows} onNew={() => openEntity("financial", "create")} onAction={(mode, index) => openEntity("financial", mode, index)} onReverse={index => confirmAction("Estornar este movimento? Um lançamento de compensação será registrado.", () => { setFinancialRows(current => current.map((item, i) => i === index ? { ...item, status: "Estornado" } : item)); notify("Movimento estornado por compensação; registro original preservado."); })} />;
    if (view === "inventory") return <Inventory data={productRows} onNew={() => openEntity("product", "create")} onAction={(mode, index) => openEntity("product", mode, index)} onDelete={() => notify("Ajuste manual indisponível na demonstração.")} />;
    if (view === "automations") return <Automations data={automationRows} onNew={() => openEntity("automation", "create")} onAction={(mode, index) => openEntity("automation", mode, index)} onDelete={() => notify("Status da automação atualizado.")} go={setView} />;
    if (view === "online") return <OnlineBooking />;
  })();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar view={view} setView={setView} open={menu} close={() => setMenu(false)} />
      <div className="min-w-0 lg:ml-60">
        <Header view={view} onMenu={() => setMenu(true)} />
        {content}
      </div>
      {entityModal && (
        entityModal.kind === "appointment" ? (
          <AppointmentModal
            mode={entityModal.mode as any}
            appointment={entityModal.fullItem}
            clients={clientRows}
            professionals={professionalRows}
            services={serviceRows}
            close={() => setEntityModal(null)}
            save={async (id, rawData) => {
              const res = await updateAppointmentRecord(id, rawData);
              if (res.success) {
                // Optimistic UI update
                setRows(current => current.map(r => r.id === id ? { ...r, time: rawData.timeStr, professional: professionalRows.find(p => p.id === rawData.professionalId)?.name || "", service: rawData.services.map((s:any)=>serviceRows.find((sr:any)=>sr.id===s.id)?.name).join(" + "), price: rawData.price } : r));
                setEntityModal(null);
                notify("Agendamento atualizado!");
              } else {
                alert(res.error);
              }
            }}
          />
        ) : entityModal.kind === "service" ? (
          <ServiceModal
            mode={entityModal.mode}
            service={entityModal.index !== undefined ? serviceRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveService}
          />
        ) : entityModal.kind === "professional" ? (
          <ProfessionalModal
            mode={entityModal.mode}
            professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveProfessional}
          />
        ) : (
          <EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />
        )
      )}
      {booking && <BookingModal clients={clientRows} professionals={professionalRows} services={serviceRows} close={() => setBooking(false)} save={async (a, rawData) => { if(rawData) { const res = await createAppointmentRecord(rawData); if (res.success) { setRows(v => [...v, { ...a, id: res.data.id }]); setBooking(false); notify("Agendamento criado com sucesso."); } else { alert(res.error); } } else { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado (demo)."); } }} />}
      {finish && activeAppointment && <FinishModal appointment={activeAppointment} close={() => setFinish(false)} done={async (method, val) => { const res = await finishAppointment({ appointmentId: activeAppointment.id, amount: val, paymentMethod: method }); if (res.success) { setRows(v => v.map(a => a.id === activeAppointment.id ? { ...a, status: "Concluído" } : a)); setFinish(false); setActiveAppointment(null); setView("agenda"); notify("Atendimento concluído e pagamento registrado com sucesso."); } else { alert(res.error); } }} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}
