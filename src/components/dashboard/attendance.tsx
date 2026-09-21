import React, { useState } from "react";
import { Check, Trash2, Plus, X, Sparkles } from "lucide-react";
import { type Appointment } from "@/lib/demo-data";
import { SectionTitle, Badge } from "../shared";
import { money } from "@/lib/demo-data";

export function Attendance({ appointment, services, onFinish, onSelect, onStatusChange, onAddExtra, onRemoveItem, allAppointments = [] }: { appointment: Appointment | null; services: any[]; onFinish: () => void; onSelect: (a: Appointment | null) => void; onStatusChange: (status: string) => void; onAddExtra: (service: any) => void; onRemoveItem: (itemId: string) => void; allAppointments: Appointment[] }) { 
    const [addingExtra, setAddingExtra] = useState(false); 
    if (!appointment) {
      const activeList = allAppointments.filter(a => a.status === "Em atendimento" || a.status === "Cliente chegou");
      return (
        <main className="page-content">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-dark">Atendimentos em andamento</h1>
            <p className="text-muted">Selecione uma cliente para conduzir o serviço.</p>
          </div>
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#DBE3EC] rounded-lg bg-[#F7F9FC]">
              <p className="text-muted mb-2">Nenhum atendimento em andamento no momento.</p>
              <p className="text-sm text-muted">Mude o status de um agendamento na Agenda para &quot;Em atendimento&quot; ou &quot;Cliente chegou&quot;.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeList.map(a => (
                <div key={a.id} onClick={() => onSelect(a)} className="card hover:border-primary hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <Badge tone={a.status === "Em atendimento" ? "green" : "blue"}>{a.status}</Badge>
                    <span className="text-xs font-medium text-muted">{a.time}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-navy-dark">{a.client}</h3>
                  <p className="text-sm text-muted mb-4">{a.service}</p>
                  <div className="flex justify-between items-center text-sm border-t border-bg pt-3">
                    <span className="text-muted">{a.professional}</span>
                    <span className="font-medium text-navy-dark">R$ {a.price.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      );
    }
    return <main className="page-content"><button onClick={() => onSelect(null)} className="mb-4 text-sm font-medium text-muted hover:text-primary flex items-center gap-1">← Voltar para a lista</button><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div>
            <select 
              value={appointment.status} 
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-sm font-medium bg-primary/10 text-primary border-none rounded-full px-3 py-1 outline-none cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <option value="Cliente chegou">Cliente chegou</option>
              <option value="Em atendimento">Em atendimento</option>
            </select><p className="mt-2 text-xs text-muted">Horário agendado: {appointment.time}</p></div><button onClick={onFinish} disabled={appointment.status !== "Em atendimento"} className={`btn-primary ${appointment.status !== "Em atendimento" ? "opacity-50 cursor-not-allowed" : ""}`} title={appointment.status !== "Em atendimento" ? "Mude o status para Em atendimento para concluir" : ""}><Check size={16} />Concluir atendimento</button></div><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="card"><SectionTitle title={appointment.client} subtitle={appointment.phone} />
{appointment.items && appointment.items.map((item: any) => (
  <div key={item.id} className="mt-2 rounded-md border border-[#E7EDF3] p-4 group">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted">{appointment.professional}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold">{money.format(item.price)}</p>
        <button onClick={() => { if(confirm("Remover este serviço?")) onRemoveItem(item.id); }} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
      </div>
    </div>
  </div>
))}

{addingExtra ? (
  <div className="mt-3 flex gap-2">
    <select className="field-input flex-1" onChange={(e) => {
      const svc = services.find((s: any) => s.id === e.target.value);
      if (svc) {
        
        onAddExtra(svc);
        setAddingExtra(false);
      }
    }}>
      <option value="">Selecione um adicional...</option>
      {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>)}
    </select>
    <button onClick={() => setAddingExtra(false)} className="btn-outline !px-3"><X size={16}/></button>
  </div>
) : (
  <button onClick={() => setAddingExtra(true)} className="btn-ghost mt-3"><Plus size={15} />Adicionar serviço ou adicional</button>
)}<div className="mt-6"><label className="field-label">Observações do atendimento</label><textarea className="field-input h-24 py-2.5" placeholder="Preferências, intercorrências ou detalhes..." /></div><div className="mt-5 rounded-md border border-dashed border-[#C8D5E3] p-5 text-center"><Sparkles className="mx-auto text-primary" size={20} /><p className="mt-2 text-xs font-medium">Fotos antes e depois</p><p className="text-[11px] text-muted">Anexe imagens ao histórico desta cliente</p><button className="btn-outline mt-3 !min-h-8">Adicionar fotos</button></div></section><aside className="card h-fit"><SectionTitle title="Resumo financeiro" /><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">Serviços</span><span>{money.format(appointment.price)}</span></div><div className="flex justify-between border-t border-[#E7EDF3] pt-3 text-base font-semibold"><span>Saldo a receber</span><span>{money.format(appointment.price)}</span></div></div><div className="mt-5 rounded-md bg-bg p-3 text-xs text-muted"><p className="font-medium text-ink">Ao concluir</p><p className="mt-1">Comissão calculada e estoque baixado.</p></div></aside></div></main> }

