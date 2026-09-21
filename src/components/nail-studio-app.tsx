/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import NextImage from "next/image";
import { View, EntityKind, EntityModalState, Badge, statusTone, Metric, RowActions, SectionTitle, SmallMetricLink } from "./shared";
import { Professionals } from "./dashboard/professionals";
import { Attendance } from "./dashboard/attendance";
import { Finance } from "./dashboard/finance";
import { Inventory } from "./dashboard/inventory";
import { Automations } from "./dashboard/automations";
import { Clients } from "./dashboard/clients";
import { Services } from "./dashboard/services";
import { Agenda } from "./dashboard/agenda";
import { updateAppointmentRecord, addServiceToAppointment, removeServiceFromAppointment } from "@/lib/actions/appointments";

import { useState, useEffect, useRef } from "react";
import {
  Archive, ArrowRight, Calendar, BarChart3, Bell, CalendarDays, Check, ChevronDown, CircleDollarSign,
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
import { createAppointmentRecord, cancelAppointmentRecord, updateAppointmentStatus, getAppointments } from "@/lib/actions/appointments";
import { finishAppointment } from "@/lib/actions/attendance";
import { createExpense } from "@/lib/actions/finance";
import { getProfessionalCommissions, payCommissions } from "@/lib/actions/commissions";
import { getClientDetails, uploadClientPhoto, deleteClientPhoto, getClients } from "@/lib/actions/clients";
import { OnlineBooking } from "./online-booking";
import { getRemindersForTomorrow } from "@/lib/actions/automations";
import { createProduct, updateProduct, addStockMovement, getInventory } from "@/lib/actions/inventory";
import { updateServiceConsumables, getServices, deleteServiceRecord, updateServiceRecord } from "@/lib/actions/services";


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





const entityLabels: Record<EntityKind, string> = { client: "cliente", service: "serviço", professional: "profissional", product: "produto", automation: "automação", appointment: "agendamento", financial: "lançamento", service_consumables: "consumo" };


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
  const [dateStr, setDateStr] = useState(appointment?.dateStr || new Date().toISOString().split("T")[0]);
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
    setSubmitting(false);
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



function ServiceConsumablesModal({ service, inventory, close, save }: { service: any; inventory: any[]; close: () => void; save: (consumables: any[]) => Promise<void> }) {
  const [items, setItems] = useState<any[]>(service.consumables || []);
  const [adding, setAdding] = useState(false); const [isSaving, setIsSaving] = useState(false);

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">Consumo Automático</Badge><h2 className="mt-2 text-xl font-bold">{service.name}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div>
  <p className="text-sm text-muted mb-4">Escolha os produtos que devem ser baixados automaticamente do estoque quando este serviço for concluído.</p>

  <div className="space-y-3 mb-4">
    {items.map((it, idx) => {
      const prod = inventory.find(p => p.id === it.product_id);
      return <div key={idx} className="flex justify-between items-center bg-bg p-3 rounded-md">
        <p className="font-medium text-sm">{prod?.product || 'Produto desconhecido'}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm">{it.estimated_quantity} {prod?.unit || 'un'}</span>
          <button onClick={() => setItems(curr => curr.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={15}/></button>
        </div>
      </div>
    })}
    {items.length === 0 && <p className="text-xs text-muted">Nenhum produto vinculado a este serviço.</p>}
  </div>

  {adding ? (
    <div className="flex gap-2 mb-4 bg-bg p-3 rounded-md border border-[#E7EDF3]">
      <select id="prod-select" className="field-input flex-1 !h-9 !py-1 text-sm"><option value="">Selecione o produto</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.product}</option>)}</select>
      <input id="prod-qtd" type="number" step="0.1" placeholder="Qtd" className="field-input w-20 !h-9 !py-1 text-sm" />
      <button onClick={() => {
        const p = document.getElementById("prod-select") as HTMLSelectElement;
        const q = document.getElementById("prod-qtd") as HTMLInputElement;
        if(p.value && q.value) {
          setItems(curr => [...curr, { product_id: p.value, estimated_quantity: Number(q.value) }]);
          setAdding(false);
        }
      }} className="btn-primary !h-9 !px-3"><Check size={16}/></button>
      <button onClick={() => setAdding(false)} className="btn-outline !h-9 !px-3"><X size={16}/></button>
    </div>
  ) : (
    <button onClick={() => setAdding(true)} className="btn-ghost mb-4"><Plus size={15}/> Adicionar produto</button>
  )}

  <div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button><button disabled={isSaving} onClick={async () => { setIsSaving(true); await save(items); setIsSaving(false); }} className="btn-primary disabled:opacity-50"><Check size={16} />{isSaving ? "Salvando..." : "Salvar configuração"}</button></div></div></div>;
}

function ProductModal({ product, close, save }: { product?: any; close: () => void; save: (data: any) => Promise<void> }) {
  const [name, setName] = useState(product?.product || "");
  const [unit, setUnit] = useState(product?.unit || "unit");
  const [min, setMin] = useState(product?.minimum ?? "");
  const [ideal, setIdeal] = useState(product?.ideal ?? "");
  const [cost, setCost] = useState(product?.cost ?? "");
  const [stock, setStock] = useState(product?.stock ?? ""); const [isSaving, setIsSaving] = useState(false);

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={close} className="absolute inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">Novo Produto</Badge><h2 className="mt-2 text-xl font-bold">Cadastrar Produto</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div><div className="space-y-4">
    <div><label className="field-label">Nome do produto</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Esmalte Risqué Vermelho" /></div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="field-label">Unidade</label><select className="field-input" value={unit} onChange={e => setUnit(e.target.value)}>
        <option value="unit">Unidade</option><option value="ml">Mililitros (ml)</option><option value="g">Gramas (g)</option><option value="pair">Par</option>
      </select></div>
      <div><label className="field-label">Custo unitário (R$)</label><input className="field-input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="field-label">Estoque mínimo</label><input className="field-input" type="number" value={min} onChange={e => setMin(e.target.value)} /></div>
      <div><label className="field-label">Estoque ideal</label><input className="field-input" type="number" value={ideal} onChange={e => setIdeal(e.target.value)} /></div>
    </div>
    <div><label className="field-label">Saldo inicial (quantidade atual)</label><input className="field-input" type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
  </div><div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-outline">Cancelar</button><button disabled={isSaving} onClick={async () => { setIsSaving(true); await save({name, unit, minimum: Number(min), ideal: Number(ideal), cost: Number(cost), stock: Number(stock)}); setIsSaving(false); }} className="btn-primary disabled:opacity-50"><Check size={16} />{isSaving ? "Salvando..." : "Salvar produto"}</button></div></div></div>;
}



function ClientDetailsModal({ client, close }: { client: any; close: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client?.id) {
      getClientDetails(client.id).then(res => {
        if (!res) { setData(null);

      setLoading(false); return; }
        setData(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

  }, [client]);


  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Tem certeza que deseja apagar esta foto?")) return;
    if (photoId.startsWith("mock-")) {
      setData((curr: any) => ({ ...curr, photos: curr.photos.filter((p: any) => p.id !== photoId) }));
      return;
    }
    const res = await deleteClientPhoto(photoId);
    if (res.success) {
      setData((curr: any) => ({ ...curr, photos: curr.photos.filter((p: any) => p.id !== photoId) }));
    } else {
      alert("Erro ao excluir foto: " + ("error" in res ? res.error : "Erro desconhecido"));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client?.id) return;

    setUploading(true);

    try {
      if (client.id.startsWith("demo-")) {
        const reader = new FileReader();
        await new Promise(resolve => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setData((curr: any) => ({
              ...curr,
              photos: [{ id: "mock-" + Date.now(), kind: "other", url: base64, storage_path: base64, created_at: new Date().toISOString() }, ...(curr?.photos || [])]
            }));
            resolve(true);
          };
          reader.readAsDataURL(file);
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', client.id);
      formData.append('kind', 'other');

      const res = await uploadClientPhoto(formData);
      if (res.success) {
        const fresh = await getClientDetails(client.id);
        setData(fresh);
      } else {
        alert("Erro ao salvar foto: " + ("error" in res ? res.error : "Erro desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro inesperado ao enviar a foto.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button onClick={close} className="absolute inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-4xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 max-h-[90vh] flex flex-col">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">Ficha da Cliente</Badge>
            <h2 className="mt-2 text-2xl font-bold">{client.name}</h2>
            <p className="text-muted">{client.phone}</p>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : !data ? (
          <div className="py-12 text-center text-muted">Cliente não encontrada no banco de dados.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Visitas totais" value={(data?.stats?.visits || 0).toString()} detail="Soma de atendimentos concluídos" icon={Calendar} />
              <Metric label="Total investido" value={money.format(data?.stats?.spent || 0)} detail="Soma de recebimentos da cliente" icon={CircleDollarSign} />
              <Metric label="Cliente desde" value={data?.stats?.memberSince || "-"} detail="Data do cadastro" icon={Check} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Histórico */}
              <section className="card p-5">
                <SectionTitle title="Histórico de Agendamentos" />
                <div className="space-y-4 mt-4">
                  {data.history.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum agendamento registrado.</p>
                  ) : (
                    (data.history || []).map((h: any) => (
                      <div key={h.id} className="flex justify-between items-center border-b border-[#E7EDF3] pb-3 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{h.date} às {h.time}</p>
                          <p className="text-xs text-muted mt-0.5">{h.services} com {h.professional}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone={h.status === 'Concluído' ? 'success' : h.status === 'Cancelado' ? 'danger' : 'warning'}>{h.status}</Badge>
                          <p className="text-xs font-semibold mt-1 text-navy-dark">{money.format(h.paid)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Fotos e Galeria */}
              <section className="card p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <SectionTitle title="Galeria Antes & Depois" />
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary text-xs py-1.5 px-3">
                    <Plus size={14} /> {uploading ? "Enviando..." : "Adicionar foto"}
                  </button>
                </div>

                {!data.photos || data.photos.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#E7EDF3] rounded-lg p-6 bg-bg/50">
                    <p className="text-sm text-muted text-center">Nenhuma foto registrada para esta cliente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(data.photos || []).map((p: any) => (

                      <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-[#E7EDF3] group">
                        {p.url ? (
    <NextImage src={p.url} alt="Unhas" fill className="object-cover" unoptimized={p.url.startsWith("data:image/")} />
  ) : (
    <div className="flex items-center justify-center w-full h-full bg-[#F5F8FA] text-[#869AB8] text-xs">Sem foto</div>
  )}
                        <button onClick={() => handleDeletePhoto(p.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md">
                          <Trash2 size={12} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 p-1 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">

                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function ProfessionalCommissionsModal({ professional, close }: { professional: any; close: () => void }) {
  const [data, setData] = useState<{ commissions: any[], stats: { pending: number, paid: number } }>({ commissions: [], stats: { pending: 0, paid: 0 } });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (professional?.id) {
      getProfessionalCommissions(professional.id).then(res => {
        setData(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

  }, [professional]);

  const handlePay = async () => {
    if (!professional?.id) return;
    const pendingIds = data.commissions.filter(c => c.status === 'generated').map(c => c.id);
    if (pendingIds.length === 0) return;

    setPaying(true);
    const res = await payCommissions(professional.id, pendingIds, data.stats.pending);
    setPaying(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Erro ao pagar comissões: " + ("error" in res ? res.error : "Erro desconhecido"));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button onClick={close} className="absolute inset-0 bg-navy-dark/40" />
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 max-h-[90vh] flex flex-col">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Badge tone="primary">Acerto de Comissões</Badge>
            <h2 className="mt-2 text-xl font-bold">{professional.name}</h2>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm text-amber-800">Saldo Pendente</p>
                <p className="text-2xl font-bold text-amber-900">{money.format(data.stats.pending)}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm text-green-800">Total já pago</p>
                <p className="text-2xl font-bold text-green-900">{money.format(data.stats.paid)}</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-lg border-[#E7EDF3]">
              <table className="data-table">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th>Data</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted">Nenhuma comissão registrada.</td></tr>
                  ) : data.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.date}</td>
                      <td>{c.service}</td>
                      <td><Badge tone={c.status === 'paid' ? 'success' : 'warning'}>{c.status === 'paid' ? 'Pago' : 'Pendente'}</Badge></td>
                      <td className="font-medium text-right">{money.format(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E7EDF3]">
          <button onClick={close} className="btn-outline">Fechar</button>
          <button
            onClick={handlePay}
            disabled={paying || data.stats.pending <= 0 || loading}
            className="btn-primary disabled:opacity-50"
          >
            <Check size={16} />{paying ? "Processando..." : "Fechar e Pagar Pendentes"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ClientModal({ mode, client, close, save }: { mode: "create" | "edit" | "view"; client?: any; close: () => void; save: (data: any) => Promise<void> }) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [birthDate, setBirthDate] = useState(client?.birthDate || "");
  const [email, setEmail] = useState(client?.email || "");
  const [cep, setCep] = useState(client?.cep || "");
  const [street, setStreet] = useState(client?.street || "");
  const [number, setNumber] = useState(client?.number || "");
  const [complement, setComplement] = useState(client?.complement || "");
  const [neighborhood, setNeighborhood] = useState(client?.neighborhood || "");
  const [city, setCity] = useState(client?.city || "");
  const [state, setState] = useState(client?.state || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const readOnly = mode === "view";


  const handlePhone = (v: string) => {
    let num = v.replace(/\D/g, "");
    if (num.length > 11) num = num.slice(0, 11);
    if (num.length > 2) num = `(${num.slice(0, 2)}) ${num.slice(2)}`;
    if (num.length > 10) num = `${num.slice(0, 10)}-${num.slice(10)}`;
    setPhone(num);
  };

  const handleCep = async (v: string) => {

    setCep(v);
    const cleanCep = v.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
          document.getElementById("address-number")?.focus();
        }
      } catch (e) { console.error(e); }
      setLoadingCep(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"><button onClick={close} className="fixed inset-0 bg-navy-dark/40" /><div className="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl sm:p-7 my-8"><div className="mb-6 flex items-start justify-between"><div><Badge tone="primary">{mode === "create" ? "Nova Cliente" : mode === "view" ? "Detalhes" : "Edição"}</Badge><h2 className="mt-2 text-xl font-bold">{name || "Novo registro"}</h2></div><button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"><X size={20} /></button></div>
  <form onSubmit={async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await save({ name, phone, birthDate, cep, street, number, complement, neighborhood, city, state, notes, email });
    setSubmitting(false);
  }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="field-label">Nome Completo</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} required disabled={readOnly} /></div>
      <div><label className="field-label">WhatsApp</label><input className="field-input" value={phone} onChange={e => handlePhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={15} required disabled={readOnly} /></div>
      <div><label className="field-label">Data de Nascimento</label><input type="date" className="field-input" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={readOnly} /></div>
      <div><label className="field-label">E-mail</label><input type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" disabled={readOnly} /></div>
      <div className="sm:col-span-2 border-t border-[#E7EDF3] pt-4 mt-2">
        <h3 className="text-sm font-semibold mb-3">Endereço</h3>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2"><label className="field-label">CEP {loadingCep && <span className="text-xs text-primary animate-pulse">(Buscando...)</span>}</label><input className="field-input" value={cep} onChange={e => handleCep(e.target.value)} disabled={readOnly} maxLength={9} placeholder="00000-000" /></div>
          <div className="sm:col-span-4"><label className="field-label">Rua</label><input className="field-input" value={street} onChange={e => setStreet(e.target.value)} disabled={readOnly} /></div>
          <div className="sm:col-span-2"><label className="field-label">Número</label><input id="address-number" className="field-input" value={number} onChange={e => setNumber(e.target.value)} disabled={readOnly} /></div>
          <div className="sm:col-span-4"><label className="field-label">Complemento</label><input className="field-input" value={complement} onChange={e => setComplement(e.target.value)} disabled={readOnly} /></div>
          <div className="sm:col-span-2"><label className="field-label">Bairro</label><input className="field-input" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} disabled={readOnly} /></div>
          <div className="sm:col-span-3"><label className="field-label">Cidade</label><input className="field-input" value={city} onChange={e => setCity(e.target.value)} disabled={readOnly} /></div>
          <div className="sm:col-span-1"><label className="field-label">UF</label><input className="field-input" value={state} onChange={e => setState(e.target.value)} disabled={readOnly} maxLength={2} /></div>
        </div>
      </div>
      <div className="sm:col-span-2 border-t border-[#E7EDF3] pt-4 mt-2">
        <label className="field-label">Observações</label><textarea className="field-input h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alergias, preferências, histórico médico..." disabled={readOnly} />
      </div>
    </div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="btn-outline">Cancelar</button>{!readOnly && <button disabled={submitting} type="submit" className="btn-primary">{submitting ? "Salvando..." : <><Check size={16} />Salvar</>}</button>}</div>
  </form></div></div>;
}

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




function Header({ view, onMenu }: { view: View; onMenu: () => void }) {
  const configured = isSupabaseConfigured();
  return <header className="sticky top-0 z-30 flex min-h-[65px] items-center justify-between border-b border-[#DBE3EC] bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex min-w-0 items-center gap-3"><button onClick={onMenu} className="rounded-md p-2 text-muted hover:bg-bg lg:hidden" aria-label="Abrir menu"><Menu size={20} /></button><div className="min-w-0"><h1 className="truncate text-base font-semibold text-ink sm:text-lg">{titles[view][0]}</h1><p className="hidden text-xs text-muted sm:block">{titles[view][1]}</p></div></div><div className="flex items-center gap-2.5"><div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-[#DBE3EC] bg-[#F7F9FC]"><Database size={13} className={configured ? "text-emerald-600" : "text-amber-600"} /><span className="text-[11px] text-muted">{configured ? "Supabase Conectado" : "Modo Demonstração"}</span></div><button className="relative rounded-md border border-[#DBE3EC] p-2.5 text-muted hover:text-primary" aria-label="Notificações"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" /></button><div className="hidden items-center gap-2 border-l border-[#DBE3EC] pl-3 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">GL</div><div><p className="text-xs font-medium">Gabi Ludwig</p><p className="text-[10px] text-muted">Proprietária</p></div><ChevronDown size={14} className="text-muted" /></div></div></header>;
}

function Sidebar({ view, setView, open, close }: { view: View; setView: (v: View) => void; open: boolean; close: () => void }) {
  return <>{open && <button onClick={close} aria-label="Fechar menu" className="fixed inset-0 z-40 bg-navy-dark/40 lg:hidden" />}<aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(250px,calc(100vw-36px))] flex-col bg-navy text-white transition-transform lg:w-60 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[65px] items-center justify-between border-b border-white/10 px-5"><button onClick={() => setView("dashboard")} className="flex items-center gap-3 text-left"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary"><Sparkles size={16} /></div><div><span className="block text-sm font-semibold">Gabi Ludwig</span><span className="block text-[10px] text-white/55">Nail Studio</span></div></button><button onClick={close} className="text-white/70 lg:hidden"><X size={19} /></button></div><nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4"><p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[.12em] text-white/45">Operação</p>{nav.slice(0, 6).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] transition ${view === id ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} strokeWidth={1.5} />{label}</button>)}<p className="px-3 pb-2 pt-5 text-[10px] font-medium uppercase tracking-[.12em] text-white/45">Gestão</p>{nav.slice(6).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13.5px] transition ${view === id ? "bg-primary text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} strokeWidth={1.5} />{label}</button>)}</nav><div className="border-t border-white/10 p-3"><button onClick={() => setView("services")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button><button onClick={() => logout()} className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-rose-400 transition-colors"><Trash2 size={16} />Sair do sistema</button></div></aside></>;
}

function Dashboard({ go, stats, onAttendance, appointments = [], clients = [] }: { go: (v: View) => void, stats?: any, onAttendance?: (a: Appointment) => void, appointments?: Appointment[], clients?: any[] }) {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const todayAppointments = appointments.filter(a => (a as any).dateStr === todayStr);
  const activeTodayAppointments = todayAppointments.filter(a => a.status !== "Concluído" && a.status !== "Cancelado");
  const todayRevenue = todayAppointments.filter(a => a.status === "Concluído").reduce((acc, a) => acc + (a.price || 0), 0);
  const todayReceived = todayAppointments.reduce((acc, a) => acc + (a.paid || 0), 0);

  // Calculate dynamic metrics
  const completedThisMonth = appointments.filter(a => a.status === "Concluído" && a.price && a.price > 0);
  const averageTicket = completedThisMonth.length > 0 ? (completedThisMonth.reduce((acc, a) => acc + (a.price || 0), 0) / completedThisMonth.length) : 0;

  // New clients (visits === 1) or no visits yet but registered
  const newClientsCount = clients.filter(c => c.visits <= 1).length;

  // Retention (visits > 1)
  const returningClients = clients.filter(c => c.visits > 1).length;
  const totalActiveClients = clients.filter(c => c.status !== "Inativa").length;
  const retentionRate = totalActiveClients > 0 ? Math.round((returningClients / totalActiveClients) * 100) : 0;

  // Occupation should not count cancelled appointments as they free up the slot
  const occupiedToday = todayAppointments.filter(a => a.status !== "Cancelado").length;
  const occupation = Math.min(100, Math.round((occupiedToday / 15) * 100));

  return <main className="page-content space-y-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric onClick={() => go("agenda")} label="Agendamentos hoje" value={activeTodayAppointments.length.toString()} detail="Agendamentos pendentes" icon={CalendarDays} /><Metric onClick={() => go("finance")} label="Faturamento do dia" value={money.format(todayRevenue)} detail="Faturamento bruto" icon={TrendingUp} /><Metric onClick={() => go("finance")} label="Recebido hoje" value={money.format(todayReceived)} detail="Recebimentos no caixa" icon={Wallet} /><Metric onClick={() => go("agenda")} label="Ocupação" value={`${occupation}%`} detail="Lotação do dia" icon={Clock3} /></div><div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><section className="card"><SectionTitle title="Agenda de hoje" subtitle="Agendamentos de hoje (ativos e próximos)" action={<button onClick={() => go("agenda")} className="btn-outline">Ver agenda <ArrowRight size={15} /></button>} /><div className="space-y-2">{activeTodayAppointments.length === 0 ? <p className="text-sm text-muted py-4 text-center">Nenhum agendamento ativo.</p> : activeTodayAppointments.slice(0, 4).map((a, i) => <button onClick={() => { if(a.status === "Em atendimento" || a.status === "Cliente chegou") { if (onAttendance) onAttendance(a); } else go("agenda"); }} key={a.id} className="flex w-full items-center gap-3 rounded-md border border-[#E7EDF3] p-3 text-left transition hover:border-primary/40 hover:bg-bg"><div className="w-12 shrink-0 text-center"><p className="text-sm font-semibold">{a.time}</p><p className="text-[10px] text-muted">{a.end}</p></div><div className={`h-10 w-1 rounded-full ${i === 0 ? "bg-primary" : i === 3 ? "bg-warning" : "bg-navy/25"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.client}</p><p className="truncate text-xs text-muted">{a.service} · {a.professional}</p></div><Badge tone={statusTone(a.status)}>{a.status}</Badge></button>)}</div></section><section className="card"><SectionTitle title="Próxima cliente" subtitle="Acompanhamento rápido" /><div className="rounded-md bg-primary-light p-4"><p className="text-sm text-center text-primary-dark">Nenhum atendimento próximo.</p></div><div className="mt-4 grid grid-cols-2 gap-3"><SmallMetricLink go={go} label="Faturamento mensal" value={stats ? money.format(stats.revenue) : "R$ 0,00"} target="finance" /><SmallMetricLink go={go} label="Ticket médio" value={averageTicket > 0 ? money.format(averageTicket) : "R$ 0,00"} target="finance" /><SmallMetricLink go={go} label="Clientes novas" value={newClientsCount.toString()} target="clients" /><SmallMetricLink go={go} label="Taxa de retorno" value={`${retentionRate}%`} target="clients" /></div></section></div></main>;
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
      source: "Interno",
      items: selectedSvcs.map((s: any) => ({ id: "temp-" + Date.now() + Math.random(), name: s.name, price: s.price }))
    }, {
      clientId,
      professionalId: profId,
      services: selectedSvcs.map((s: any) => ({ id: s.id, price: s.price, durationMinutes: s.duration })),
      dateStr,
      timeStr,
      durationMinutes: totalDuration,
      price: totalPrice
    });
    setSubmitting(false);
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

export function NailStudioApp({ initialClients = demoClients, initialProfessionals = demoProfessionals, initialSpecialties = [], initialAppointments = [], initialInventory = [], initialServices = demoServices as any[], initialFinancials = [], initialStats = { revenue: 0, expenses: 0, commissions: 0, balance: 0 } }: { initialClients?: ClientItem[]; initialProfessionals?: ProfessionalItem[]; initialSpecialties?: {id: string, name: string}[]; initialAppointments?: Appointment[]; initialServices?: any[]; initialInventory?: any[]; initialFinancials?: any[]; initialStats?: any }) {
  const [view, setView] = useState<View>("dashboard"); const [menu, setMenu] = useState(false); const [booking, setBooking] = useState(false); const [finish, setFinish] = useState(false); const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null); const [toast, setToast] = useState(""); const [rows, setRows] = useState(initialAppointments);

  // Auto-refresh appointments when looking at the agenda
  useEffect(() => {
    if (view === "agenda") {
      const interval = setInterval(() => {
        getAppointments().then(fresh => setRows(fresh));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const [clientRows, setClientRows] = useState(() => [...initialClients]); const [serviceRows, setServiceRows] = useState(() => [...initialServices]);
  const [professionalRows, setProfessionalRows] = useState(() => [...initialProfessionals]); const [productRows, setProductRows] = useState<any[]>(initialInventory);
  const initialTemplates = [{ name: "Lembrete 24h", count: "18 agendadas", tone: "success" }, { name: "Sinal pendente", count: "3 aguardando", tone: "warning" }, { name: "Manutenção vencida", count: "7 oportunidades", tone: "danger" }, { name: "Aniversário", count: "2 nesta semana", tone: "primary" }];
const [automationRows, setAutomationRows] = useState(() => [...initialTemplates]); const [specialtyList, setSpecialtyList] = useState(() => [...initialSpecialties]); const [financialRows, setFinancialRows] = useState(() => [...initialFinancials]); const [entityModal, setEntityModal] = useState<EntityModalState | null>(null);
  const [closingCommissionFor, setClosingCommissionFor] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
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

  const saveClient = async (data: any) => {
    if (!entityModal) return;
    const creating = entityModal.mode === "create";
    if (creating) {
      const res = await createClientRecord(data);
      if (res.success) {
        // Fetch fresh list from DB to ensure correct alphabetical order and data
        const fresh = await getClients();
        setClientRows(fresh);
      } else {
        alert("Erro ao salvar cliente: " + ("error" in res ? res.error : "Erro desconhecido"));
        return;
      }
    } else if (entityModal.index !== undefined) {
      const item = clientRows[entityModal.index];
      if (item.id) await updateClientRecord(item.id, data);
      setClientRows(current => current.map((c, i) => i === entityModal.index ? { ...c, ...data } : c));
    }
    setEntityModal(null); notify(creating ? "Cliente cadastrada." : "Cliente atualizada.");
  };

  const saveEntity = async (name: string, detail: string) => {

    if (!entityModal) return; const { kind, mode, index } = entityModal; const creating = mode === "create";

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
    if (kind === "financial") {
      const value = Number(detail.replace(/[^0-9,]/g, "").replace(",", ".")) || 0;
      if (creating) {
        const res = await createExpense(name, value);
        if (res.success) window.location.reload();
      }
    }
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
        alert(("error" in res ? res.error : "Erro desconhecido"));
      }
    } else {
      if (typeof entityModal.index !== "number") return;
      const itemToUpdate = serviceRows[entityModal.index];
      if (itemToUpdate && itemToUpdate.id && !itemToUpdate.id.startsWith("demo-")) {
        const res = await updateServiceRecord(itemToUpdate.id, data);
        if (!res.success) { alert(("error" in res ? res.error : "Erro desconhecido")); return; }
      }
      setServiceRows(current => current.map((item, i) => i === entityModal.index ? { ...item, ...data } : item));
      notify("Serviço atualizado com sucesso.");
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
    if (view === "dashboard") return <Dashboard stats={initialStats} go={setView} appointments={rows} clients={clientRows} onAttendance={(a) => { setActiveAppointment(a); setView("attendance"); }} />;
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
  onCancel={(index, id) => confirmAction("Cancelar este agendamento? O histórico será preservado.", () => { cancelAppointmentRecord(id).then(res => { if(res.success) { setRows(current => current.map((item, i) => i === index ? { ...item, status: "Cancelado" } : item)); notify("Agendamento cancelado e horário liberado."); } else alert(("error" in res ? res.error : "Erro desconhecido")); }) })} />;
    if (view === "clients") return <Clients data={clientRows} onNew={() => openEntity("client", "create")} onAction={(mode, index) => { if (mode === "view") { setViewingClient(clientRows[index]); } else { openEntity("client", mode, index); } }} onArchive={index => confirmAction("Arquivar esta cliente? O histórico será preservado.", async () => { const item = clientRows[index]; if (item.id) await archiveClientRecord(item.id); setClientRows(current => current.map((c, i) => i === index ? { ...c, status: "Inativa" } : c)); notify("Cliente arquivada; histórico preservado."); })} onRestore={async (index) => { const item = clientRows[index]; if (item.id) await updateClientRecord(item.id, { ...item, status: "active" } as any); setClientRows(current => current.map((c, i) => i === index ? { ...c, status: "Ativa" } : c)); notify("Cliente reativada."); }} />;
    if (view === "services") return <Services data={serviceRows} onNew={() => openEntity("service", "create")} onAction={(mode, index) => openEntity("service", mode, index)} onDelete={index => confirmAction("Excluir este serviço?", async () => { const item = serviceRows[index]; if (item.id && !item.id.startsWith("demo-")) { await deleteServiceRecord(item.id); } setServiceRows(current => current.filter((_, i) => i !== index)); notify("Serviço removido."); })} onConsumables={(index) => openEntity("service_consumables" as any, "edit", index)} />;
    if (view === "professionals") return <Professionals data={professionalRows} onNew={() => openEntity("professional", "create")} onAction={(mode, index) => openEntity("professional", mode, index)} onDelete={index => confirmAction("Arquivar esta profissional? Agendamentos anteriores serão preservados.", async () => { const item = professionalRows[index]; if (item.id) await archiveProfessionalRecord(item.id); setProfessionalRows(current => current.filter((_, i) => i !== index)); notify("Profissional arquivada."); })} />;
    if (view === "attendance") return (
      <Attendance
        appointment={activeAppointment}
        services={serviceRows}
        allAppointments={rows}
        onSelect={(a) => setActiveAppointment(a)}
        onAddExtra={async (svc) => {
          if (!activeAppointment) return;
          const profId = professionalRows.find(p => p.name === activeAppointment.professional)?.id;
          if (profId) {
            const tempId = "temp-" + Date.now();
            const newPrice = activeAppointment.price + svc.price;
            const newService = activeAppointment.service + " + " + svc.name;
            const newItems = [...(activeAppointment.items || []), { id: tempId, name: svc.name, price: svc.price }];

            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
            setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });

            const res = await addServiceToAppointment(activeAppointment.id, profId, svc.id, svc.price, svc.duration);
            if (res.success && res.id) {
              // Update with real ID so they can remove it
              const finalItems = newItems.map(i => i.id === tempId ? { ...i, id: res.id } : i);
              setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, items: finalItems } : item));
              setActiveAppointment(curr => curr ? { ...curr, items: finalItems } : null);
            }
          }
        }}
        onRemoveItem={async (itemId) => {
          if (!activeAppointment) return;
          const removedItem = activeAppointment.items?.find(i => i.id === itemId);
          if (!removedItem) return;

          const newPrice = activeAppointment.price - removedItem.price;
          const newItems = activeAppointment.items?.filter(i => i.id !== itemId) || [];
          const newService = newItems.map(i => i.name).join(" + ");

          setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, price: newPrice, service: newService, items: newItems } : item));
          setActiveAppointment({ ...activeAppointment, price: newPrice, service: newService, items: newItems });

          await removeServiceFromAppointment(itemId);
        }}
        onStatusChange={(newStatus) => {
          if (!activeAppointment) return;
          const map: Record<string, string> = {
            "Cliente chegou": "arrived",
            "Em atendimento": "in_progress",
          };
          const dbStatus = map[newStatus];
          if (dbStatus) {
            setRows(current => current.map(item => item.id === activeAppointment.id ? { ...item, status: newStatus as any } : item));
            setActiveAppointment({ ...activeAppointment, status: newStatus as any });
            updateAppointmentStatus(activeAppointment.id, dbStatus);
          }
        }}
        onFinish={() => setFinish(true)}
      />
    ); if (view === "finance") return <Finance stats={initialStats} data={financialRows} onNew={() => openEntity("financial", "create")} onAction={(mode, index) => openEntity("financial", mode, index)} onReverse={index => confirmAction("Estornar este movimento? Um lançamento de compensação será registrado.", () => { setFinancialRows(current => current.map((item, i) => i === index ? { ...item, status: "Estornado" } : item)); notify("Movimento estornado por compensação; registro original preservado."); })} />;
    if (view === "inventory") return <Inventory data={productRows} onNew={() => openEntity("product", "create")} onAction={(mode, index) => openEntity("product", mode, index)} onDelete={(index) => { openEntity("product", "edit", index); notify("Atualize o campo \"Saldo atual\" para corrigir o estoque."); }} />;
    if (view === "automations") return <Automations go={setView} />;
    if (view === "online") return <OnlineBooking />;
  })();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar view={view} setView={setView} open={menu} close={() => setMenu(false)} />
      <div className="min-w-0 lg:ml-60">
        <Header view={view} onMenu={() => setMenu(true)} />
        {content}
      </div>
      {viewingClient && <ClientDetailsModal client={viewingClient} close={() => setViewingClient(null)} />}
      {closingCommissionFor && <ProfessionalCommissionsModal professional={closingCommissionFor} close={() => setClosingCommissionFor(null)} />}
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
                alert(("error" in res ? res.error : "Erro desconhecido"));
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
          entityModal.kind === "client" ? <ClientModal mode={entityModal.mode} client={entityModal.index !== undefined ? clientRows[entityModal.index] : undefined} close={() => setEntityModal(null)} save={saveClient} /> : (entityModal.kind !== "product" && entityModal.kind !== "service_consumables" ? <EntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.index ?? "new"}`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} /> : null)
        )
      )}

      {entityModal && entityModal.kind === "product" && (
        <ProductModal
          product={entityModal.mode !== "create" && entityModal.index !== undefined ? productRows[entityModal.index] : undefined}
          close={() => setEntityModal(null)}
          save={async (data) => {
            let res;
            if (entityModal.mode === "create") {
              res = await createProduct(data);
            } else {
              const p = productRows[entityModal.index!];
              res = await updateProduct(p.id, { ...data, currentStock: p.stock });
            }
            if (res.success) {
              const fresh = await getInventory();
              setProductRows(fresh);
              setEntityModal(null);
            } else {
              alert("Erro ao salvar produto: " + ("error" in res ? res.error : "Erro desconhecido"));
            }
          }}
        />
      )}
      {entityModal && entityModal.kind === "service_consumables" && (
        <ServiceConsumablesModal
          service={serviceRows[entityModal.index!]}
          inventory={productRows}
          close={() => setEntityModal(null)}
          save={async (items) => {
            const svc = serviceRows[entityModal.index!];
            const res = await updateServiceConsumables(svc.id, items.map(i => ({ product_id: i.product_id, quantity: i.estimated_quantity })));
            if (res.success) {
              const freshServices = await getServices();
              setServiceRows(freshServices as any[]);
              setEntityModal(null);
            } else {
              alert("Erro ao salvar: " + (res as any).error);
            }
          }}
        />
      )}

      {booking && <BookingModal clients={clientRows} professionals={professionalRows} services={serviceRows} close={() => setBooking(false)} save={async (a, rawData) => { if(rawData) { const res = await createAppointmentRecord(rawData); if (res.success) { const fresh = await getAppointments(); setRows(fresh); setBooking(false); notify("Agendamento criado com sucesso."); } else { alert(("error" in res ? res.error : "Erro desconhecido")); } } else { setRows(v => [...v, a]); setBooking(false); notify("Agendamento criado (demo)."); } }} />}
      {finish && activeAppointment && <FinishModal appointment={activeAppointment} close={() => setFinish(false)} done={async (method, val) => { const res = await finishAppointment({ appointmentId: activeAppointment.id, amount: val, paymentMethod: method }); if (res.success) { setRows(v => v.map(a => a.id === activeAppointment.id ? { ...a, status: "Concluído", paid: (a.paid || 0) + val } : a)); setFinish(false); setActiveAppointment(null); setView("agenda"); notify("Atendimento concluído e pagamento registrado com sucesso."); } else { alert(("error" in res ? res.error : "Erro desconhecido")); } }} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}
