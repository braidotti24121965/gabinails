import React, { useState, useEffect } from "react";
import { Plus, Search, Mail, MessageCircle, Settings, ChevronRight, Activity, CalendarDays, ArrowRight } from "lucide-react";
import { Badge, SectionTitle, type View, Metric } from "../shared";
import { getRemindersForTomorrow, getOverdueMaintenances } from "@/lib/actions/automations";
import { Check, Calendar, Users, Copy, AlertTriangle } from "lucide-react";

export const initialTemplates = [{ name: "Lembrete 24h", count: "18 agendadas", tone: "success" }, { name: "Sinal pendente", count: "3 aguardando", tone: "warning" }, { name: "Manutenção vencida", count: "7 oportunidades", tone: "danger" }, { name: "Aniversário", count: "2 nesta semana", tone: "primary" }];

export function Automations({ go }: { go: (v: View) => void }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reminders" | "retention">("reminders");

  const loadData = async () => {
    setLoading(true);
    const [remRes, overRes] = await Promise.all([
      getRemindersForTomorrow(),
      getOverdueMaintenances()
    ]);
    setReminders(remRes);
    setOverdue(overRes);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openWhatsApp = (phone: string, message: string, list: "reminders" | "overdue", index: number) => {
    const cleanPhone = phone.replace(/\D/g, "");
    let finalPhone = cleanPhone;
    if (finalPhone.startsWith("55") && finalPhone.length > 11) {
      finalPhone = finalPhone.substring(2);
    }
    const url = `https://wa.me/55${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    
    // Mark as sent visually
    if (list === "reminders") {
      setReminders(curr => curr.map((r, i) => i === index ? { ...r, sent: true } : r));
    } else {
      setOverdue(curr => curr.map((r, i) => i === index ? { ...r, sent: true } : r));
    }
  };

  return (
    <main className="page-content">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Disparos e Automações</h1>
          <p className="text-muted">Aumente sua retenção de clientes e evite furos na agenda.</p>
        </div>
        <button onClick={loadData} className="btn-outline">
          <Calendar size={16} /> Atualizar listas
        </button>
      </div>

      <div className="mb-6 border-b border-[#E7EDF3]">
        <div className="flex gap-6">
          <button 
            onClick={() => setTab("reminders")}
            className={`pb-3 font-medium border-b-2 transition-colors ${tab === "reminders" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
          >
            Lembretes de Agenda
          </button>
          <button 
            onClick={() => setTab("retention")}
            className={`pb-3 font-medium border-b-2 transition-colors ${tab === "retention" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
          >
            Retenção (Manutenção Vencida)
          </button>
        </div>
      </div>

      {tab === "reminders" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Metric label="Lembretes pendentes" value={reminders.filter(r => !r.sent).length.toString()} detail="Próximos horários marcados" icon={MessageCircle} />
            <Metric label="Já enviados" value={reminders.filter(r => r.sent).length.toString()} detail="Confirmados no WhatsApp Web" icon={Check} />
            <Metric onClick={() => go("agenda")} label="Agendamentos vazios" value="0" detail="Clientes sem celular" icon={Users} />
          </div>

          <section className="card">
            <SectionTitle title="Fila de Mensagens" subtitle="Clique em Enviar para abrir o WhatsApp Web com o texto pronto." />
            
            {loading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#E7EDF3] rounded-lg mt-4">
                <p className="text-muted mb-2">A fila está vazia.</p>
                <p className="text-sm text-muted">Não há agendamentos válidos no futuro ou eles já foram confirmados.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {reminders.map((r, i) => (
                  <MessageCard key={r.id} item={r} onSend={() => openWhatsApp(r.phone, r.message, "reminders", i)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "retention" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <Metric label="Oportunidades de retorno" value={overdue.filter(r => !r.sent).length.toString()} detail="Mais de 20 dias sem voltar" icon={AlertTriangle} tone="warning" />
            <Metric label="Reativações tentadas" value={overdue.filter(r => r.sent).length.toString()} detail="WhatsApp enviado" icon={Check} tone="success" />
          </div>

          <section className="card">
            <SectionTitle title="Clientes em Risco" subtitle="Fizeram manutenção/alongamento há mais de 20 dias e não têm retorno agendado." />
            
            {loading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
            ) : overdue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#E7EDF3] rounded-lg mt-4">
                <p className="text-muted mb-2">Nenhuma cliente pendente.</p>
                <p className="text-sm text-muted">A sua retenção está ótima! Todas as clientes de alongamento têm retorno marcado.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {overdue.map((r, i) => (
                  <MessageCard 
                    key={r.id} 
                    item={r} 
                    onSend={() => openWhatsApp(r.phone, r.message, "overdue", i)} 
                    badgeText={`Há ${r.daysSince} dias`}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

    </main>
  );
}

function MessageCard({ item, onSend, badgeText }: { item: any, onSend: () => void, badgeText?: string }) {
  return (
    <div className={`p-4 rounded-lg border ${item.sent ? 'border-emerald-200 bg-emerald-50/50' : 'border-[#E7EDF3] bg-surface'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{item.clientName}</h3>
          <p className="text-xs text-muted">
            {item.lastDate ? `Última visita: ${item.lastDate} · ` : (item.message.includes("amanhã") ? "Amanhã · " : `Dia ${item.message.match(/dia (\d{2}\/\d{2})/)?.[1]} às ${item.time} · `)}
            {item.lastService || item.services}
          </p>
        </div>
        <div className="flex gap-2">
          {badgeText && <Badge tone="danger">{badgeText}</Badge>}
          <Badge tone={item.sent ? "success" : "warning"}>{item.sent ? "Enviado" : "Pendente"}</Badge>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded border border-[#E7EDF3] text-sm text-ink font-sans relative">
        <div className="absolute top-0 right-0 bottom-0 w-1 bg-green-500 rounded-r"></div>
        {item.message}
      </div>
      
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => {
          navigator.clipboard.writeText(item.message);
          alert("Mensagem copiada!");
        }} className="btn-outline py-1.5 px-3 text-xs">
          <Copy size={14} /> Copiar texto
        </button>
        <button 
          onClick={onSend}
          className="btn-primary bg-green-600 hover:bg-green-700 border-green-600 py-1.5 px-3 text-xs"
        >
          <MessageCircle size={14} /> {item.sent ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
        </button>
      </div>
    </div>
  );
}
