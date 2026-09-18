export type AppointmentStatus = "Pendente" | "Agendado" | "Confirmado" | "Cliente chegou" | "Em atendimento" | "Concluído" | "Reagendado" | "Cancelado" | "Não compareceu" | "Aguardando sinal";

export interface Appointment { items?: { id: string; name: string; price: number }[]; id: string; time: string; end: string; client: string; phone: string; service: string; professional: string; status: AppointmentStatus; price: number; paid?: number; source: string; }

export const appointments: Appointment[] = [
  { id: "a1", time: "08:00", end: "09:15", client: "Mariana Costa", phone: "(51) 99912-3044", service: "Alongamento em gel", professional: "Gabi Ludwig", status: "Concluído", price: 185, paid: 185, source: "Instagram" },
  { id: "a2", time: "09:30", end: "10:30", client: "Ana Paula Souza", phone: "(51) 99103-8872", service: "Manutenção em gel", professional: "Gabi Ludwig", status: "Em atendimento", price: 130, paid: 30, source: "Retorno" },
  { id: "a3", time: "10:45", end: "11:30", client: "Clara Martins", phone: "(51) 99841-2210", service: "Esmaltação em gel", professional: "Júlia Mendes", status: "Confirmado", price: 85, source: "WhatsApp" },
  { id: "a4", time: "13:30", end: "14:30", client: "Beatriz Alves", phone: "(51) 99742-1733", service: "Spa dos pés + pedicure", professional: "Camila Rocha", status: "Agendado", price: 105, source: "Indicação" },
  { id: "a5", time: "15:00", end: "16:30", client: "Fernanda Lima", phone: "(51) 99655-0871", service: "Blindagem + nail art", professional: "Gabi Ludwig", status: "Aguardando sinal", price: 165, source: "Online" },
  { id: "a6", time: "17:00", end: "18:00", client: "Luiza Torres", phone: "(51) 99488-3102", service: "Manicure + pedicure", professional: "Nina Duarte", status: "Confirmado", price: 92, source: "Retorno" }
];

export const clients = [
  { id: "demo-1", name: "Mariana Costa", phone: "(51) 99912-3044", last: "Hoje", next: "08 out", visits: 18, spent: 2380, status: "Ativa", whitelist: true, tag: "VIP" },
  { id: "demo-2", name: "Ana Paula Souza", phone: "(51) 99103-8872", last: "Hoje", next: "14 out", visits: 12, spent: 1440, status: "Ativa", whitelist: true, tag: "Manutenção" },
  { id: "demo-3", name: "Clara Martins", phone: "(51) 99841-2210", last: "22 ago", next: "Hoje", visits: 4, spent: 510, status: "Ativa", whitelist: false, tag: "Nova" },
  { id: "demo-4", name: "Beatriz Alves", phone: "(51) 99742-1733", last: "02 set", next: "Hoje", visits: 9, spent: 890, status: "Ativa", whitelist: false, tag: "Recorrente" },
  { id: "demo-5", name: "Paula Nunes", phone: "(51) 99311-2030", last: "12 jun", next: "—", visits: 7, spent: 780, status: "Inativa", whitelist: false, tag: "90+ dias" },
  { id: "demo-6", name: "Renata Freire", phone: "(51) 99218-7102", last: "10 jul", next: "—", visits: 11, spent: 1290, status: "Ativa", whitelist: true, tag: "60 dias" }
];

export const services = [
  { name: "Alongamento em gel", category: "Alongamento", duration: 90, price: 185, maintenance: 21, active: true },
  { name: "Manutenção em gel", category: "Manutenção", duration: 60, price: 130, maintenance: 21, active: true },
  { name: "Esmaltação em gel", category: "Esmaltação", duration: 45, price: 85, maintenance: 18, active: true },
  { name: "Blindagem", category: "Tratamento", duration: 60, price: 115, maintenance: 21, active: true },
  { name: "Manicure tradicional", category: "Mãos", duration: 35, price: 45, maintenance: 10, active: true },
  { name: "Pedicure", category: "Pés", duration: 45, price: 55, maintenance: 15, active: true },
  { name: "Spa dos pés", category: "Pés", duration: 40, price: 65, maintenance: 20, active: true },
  { name: "Nail art premium", category: "Adicional", duration: 30, price: 50, maintenance: 0, active: true }
];

export const professionals = [
  { name: "Gabi Ludwig", initials: "GL", specialty: "Gel e nail art", today: 5, production: 8120, occupation: 87, commission: 3248 },
  { name: "Júlia Mendes", initials: "JM", specialty: "Fibra e gel", today: 4, production: 5940, occupation: 78, commission: 2079 },
  { name: "Camila Rocha", initials: "CR", specialty: "Pedicure e spa", today: 4, production: 4280, occupation: 72, commission: 1498 },
  { name: "Nina Duarte", initials: "ND", specialty: "Manicure e blindagem", today: 3, production: 3860, occupation: 68, commission: 1351 }
];

export const inventory = [
  { product: "Lixa banana 100/180", unit: "un", stock: 30, minimum: 25, ideal: 60, forecast: 42, cost: 1.9 },
  { product: "Base gel construtora", unit: "ml", stock: 110, minimum: 80, ideal: 200, forecast: 92, cost: 1.15 },
  { product: "Prep desidratador", unit: "ml", stock: 42, minimum: 50, ideal: 120, forecast: 55, cost: .82 },
  { product: "Luvas nitrílicas", unit: "un", stock: 24, minimum: 40, ideal: 100, forecast: 38, cost: .48 },
  { product: "Óleo de cutícula", unit: "ml", stock: 76, minimum: 40, ideal: 100, forecast: 28, cost: .7 }
];

export const recovery = [
  { client: "Isabela Moraes", reason: "Manutenção atrasada", delay: "6 dias", value: 130, tone: "danger" },
  { client: "Renata Freire", reason: "60 dias sem atendimento", delay: "Contato sugerido", value: 115, tone: "warning" },
  { client: "Paula Nunes", reason: "90+ dias sem atendimento", delay: "Prioridade alta", value: 185, tone: "danger" },
  { client: "Sofia Ribeiro", reason: "Aniversário amanhã", delay: "Cupom disponível", value: 85, tone: "success" }
];

export const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
