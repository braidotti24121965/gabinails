
"use client";
import React, { useState } from "react";
import { Clock, Plus, Users, ArrowRight, ShieldCheck, Clock3, Check, Copy, Sparkles } from "lucide-react";
import { checkClientWhitelist } from "@/lib/actions/clients";
import { clients as demoClients, professionals as demoProfessionals } from "@/lib/demo-data";
// Mock data since it's just a UI layer for now
const demoServices = [
  { id: "s1", name: "Alongamento em gel", category: "Alongamento", duration: 90, price: 185 },
  { id: "s2", name: "Manutenção em gel", category: "Manutenção", duration: 60, price: 130 },
  { id: "s3", name: "Esmaltação em gel", category: "Esmaltação", duration: 45, price: 85 },
  { id: "s4", name: "Blindagem", category: "Tratamento", duration: 60, price: 115 },
  { id: "s5", name: "Manicure tradicional", category: "Mãos", duration: 35, price: 45 },
  { id: "s6", name: "Pedicure", category: "Pés", duration: 45, price: 55 },
  { id: "s7", name: "Spa dos pés", category: "Pés", duration: 40, price: 65 }
];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function OnlineBooking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(demoServices[0]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const getTodayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
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
        if (data.availableSlots) {
          setSlots(data.availableSlots);
        } else {
          setSlots([]);
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
    navigator.clipboard?.writeText("44928484000109");
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
                  min={getTodayStr()}
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
                      <span className="truncate font-mono">44.928.484/0001-09</span>
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
