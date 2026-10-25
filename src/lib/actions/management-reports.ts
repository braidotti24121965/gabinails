"use server";
import { createClient } from "@/lib/supabase/server";

export async function getManagementReports(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mês inválido" };
  const db = await createClient();
  if (!db) return { error: "Banco indisponível" };
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { error: "Sessão expirada. Entre novamente no sistema." };
  const { data: profile, error: profileError } = await db.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
  if (profileError) return { error: "Não foi possível consultar o perfil da sessão." };
  if (!profile?.organization_id) return { error: "Organização não encontrada" };
  const org = profile.organization_id;
  const [year, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, m, 1)).toISOString().slice(0,10);
  const [appts, expenses, payments, clients, commissions] = await Promise.all([
    db.from("appointments").select("id,client_id,professional_id,status,starts_at,clients(name),professionals(name),appointment_items(unit_price,quantity,discount,surcharge,services(name))").eq("organization_id",org).gte("starts_at",start).lt("starts_at",end).limit(5000),
    db.from("expenses").select("id,description,category,amount,status,due_date,paid_at").eq("organization_id",org).gte("due_date",start).lt("due_date",end).limit(5000),
    db.from("payments").select("id,amount,status,kind,paid_at").eq("organization_id",org).gte("paid_at",start).lt("paid_at",end).limit(5000),
    db.from("clients").select("id,name,created_at").eq("organization_id",org).limit(5000),
    db.from("commissions").select("id,amount,status,created_at").eq("organization_id",org).gte("created_at",start).lt("created_at",end).limit(5000)
  ]);
  const error = [appts,expenses,payments,clients,commissions].find(x=>x.error)?.error;
  if (error) return { error: error.message };
  const appointments = (appts.data || []) as any[];
  const expenseRows = (expenses.data || []) as any[];
  const paid = (payments.data || []) as any[];
  const people = (clients.data || []) as any[];
  const commissionRows = (commissions.data || []) as any[];
  const group = (rows: any[], getKey: (r:any)=>string, getValue:(r:any)=>number) => {
    const map = new Map<string,{name:string,count:number,total:number}>();
    for(const row of rows) { const key=getKey(row)||"Não informado"; const item=map.get(key)||{name:key,count:0,total:0}; item.count++; item.total+=getValue(row); map.set(key,item); }
    return Array.from(map.values()).sort((a,b)=>b.total-a.total);
  };
  const appointmentValue = (a:any) => a.status==="completed" ? (a.appointment_items||[]).reduce((n:number,i:any)=>n+Number(i.unit_price||0)*Number(i.quantity||1)-Number(i.discount||0)+Number(i.surcharge||0),0) : 0;
  const revenue = paid.reduce((n,p)=>n+(p.status==="paid" ? (["refund","chargeback"].includes(p.kind)?-1:1)*Number(p.amount||0):0),0);
  const expenseTotal = expenseRows.reduce((n,e)=>n+Number(e.amount||0),0);
  const completed = appointments.filter(a=>a.status==="completed");
  const services = completed.flatMap(a=>(a.appointment_items||[]).map((i:any)=>({name:i.services?.name||"Serviço",value:Number(i.unit_price||0)*Number(i.quantity||1)-Number(i.discount||0)+Number(i.surcharge||0)})));
  const clientVisits = group(completed,a=>a.clients?.name||"Cliente",appointmentValue);
  const professionalStats = group(completed,a=>a.professionals?.name||"Profissional",appointmentValue);
  const days = group(appointments,a=>String(a.starts_at||"").slice(0,10),()=>1);
  const statuses = group(appointments,a=>a.status||"Não informado",()=>1);
  const expenseCategories = group(expenseRows,e=>e.category||"Sem categoria",e=>Number(e.amount||0));
  const newClients = people.filter(c=>String(c.created_at||"").slice(0,7)===month).length;
  return {
    month, financial:{revenue,expenses:expenseTotal,profit:revenue-expenseTotal,commissions:commissionRows.reduce((n,c)=>n+Number(c.amount||0),0)},
    appointments:{total:appointments.length,completed:completed.length,cancelled:appointments.filter(a=>["cancelled","canceled"].includes(a.status)).length,services:group(services,s=>s.name,s=>s.value)},
    clients:{newClients,activeClients:new Set(completed.map(a=>a.client_id).filter(Boolean)).size,ranking:clientVisits},
    professionals:professionalStats,
    expenses:{total:expenseTotal,paid:expenseRows.filter(e=>e.status==="paid").reduce((n,e)=>n+Number(e.amount||0),0),pending:expenseRows.filter(e=>e.status==="pending").reduce((n,e)=>n+Number(e.amount||0),0),categories:expenseCategories,items:expenseRows.map(e=>({name:e.description||"Despesa",category:e.category||"Sem categoria",total:Number(e.amount||0),status:e.status,date:e.due_date}))},
    schedule:{days,statuses,occupation: null as number|null}
  };
}
