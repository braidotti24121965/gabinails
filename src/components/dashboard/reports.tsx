"use client";
import React, { useEffect, useState } from "react";
import { money } from "@/lib/demo-data";
import { getManagementReports } from "@/lib/actions/management-reports";

type Report = Exclude<Awaited<ReturnType<typeof getManagementReports>>, {error:string}>;
const sections = ["Financeiro","Atendimentos","Clientes","Profissionais","Despesas","Agendamentos"] as const;
const fmt = (n:number) => money.format(n||0);
export function Reports({ data: _legacy }: {data:any}) {
  const [month,setMonth] = useState(()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"}).slice(0,7));
  const [tab,setTab] = useState<(typeof sections)[number]>("Financeiro");
  const [report,setReport] = useState<Report|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  useEffect(()=>{let alive=true;setLoading(true);setReport(null);setError("");getManagementReports(month).then(result=>{if(!alive)return;if("error" in result)setError(result.error||"Falha na consulta");else setReport(result as Report);}).catch(e=>{if(alive)setError(String(e));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false};},[month]);
  const rows: {label:string;count?:number;value?:number;detail?:string}[] = !report ? [] : tab==="Financeiro" ? [
    {label:"Receitas recebidas",value:report.financial.revenue},{label:"Despesas registradas",value:report.financial.expenses},{label:"Resultado (receitas - despesas)",value:report.financial.profit},{label:"Comissões",value:report.financial.commissions}
  ] : tab==="Atendimentos" ? [
    {label:"Total de agendamentos",count:report.appointments.total},{label:"Concluídos",count:report.appointments.completed},{label:"Cancelados",count:report.appointments.cancelled},
    ...report.appointments.services.map(x=>({label:x.name,count:x.count,value:x.total}))
  ] : tab==="Clientes" ? [
    {label:"Novos clientes cadastrados",count:report.clients.newClients},{label:"Clientes atendidos",count:report.clients.activeClients},
    ...report.clients.ranking.map(x=>({label:x.name,count:x.count,value:x.total}))
  ] : tab==="Profissionais" ? report.professionals.map(x=>({label:x.name,count:x.count,value:x.total})) : tab==="Despesas" ? [
    {label:"Total registrado",value:report.expenses.total},{label:"Pagas",value:report.expenses.paid},{label:"Pendentes",value:report.expenses.pending},
    ...report.expenses.categories.map(x=>({label:x.name,count:x.count,value:x.total})),
    ...report.expenses.items.map(x=>({label:x.name,value:x.total,detail:`${x.date} · ${x.category} · ${x.status}`}))
  ] : [
    {label:"Total de agendamentos",count:report.appointments.total},{label:"Concluídos",count:report.appointments.completed},{label:"Cancelados",count:report.appointments.cancelled},
    ...report.schedule.days.map(x=>({label:x.name,count:x.count})),
    ...report.schedule.statuses.map(x=>({label:`Status: ${x.name}`,count:x.count}))
  ];
  const exportCsv=()=>{const csv=[["Descrição","Quantidade","Valor","Detalhes"],...rows.map(r=>[r.label,String(r.count??""),String(r.value??""),r.detail??""])].map(line=>line.map(v=>`"${v.replace(/"/g,'""')}"`).join(";")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`gabi-nails-${tab.toLowerCase()}-${month}.csv`;a.click();URL.revokeObjectURL(url);};
  return <main className="page-content space-y-5">
    <div className="card flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-lg font-bold text-slate-800">Relatórios gerenciais</h2><p className="text-sm text-muted">Selecione o mês e o relatório desejado.</p></div>
      <label className="text-sm font-medium text-slate-700">Mês de referência<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="field-input mt-1 block"/></label>
      <div className="flex gap-2"><button className="btn-outline" disabled={!report||loading} onClick={exportCsv}>Exportar Excel (CSV)</button><button className="btn-outline" disabled={!report||loading} onClick={()=>window.print()}>Salvar PDF / Imprimir</button></div>
    </div>
    <nav className="flex flex-wrap gap-2" aria-label="Tipos de relatório">{sections.map(name=><button key={name} onClick={()=>setTab(name)} className={tab===name?"btn-primary":"btn-outline"}>{name}</button>)}</nav>
    {loading&&<section className="card text-sm text-muted">Carregando dados do período...</section>}
    {error&&<section className="card text-sm text-red-600">Não foi possível consultar os dados: {error}</section>}
    {!loading&&!error&&report&&<section className="card">
      <h3 className="mb-1 text-lg font-semibold">{tab} — {month.split("-").reverse().join("/")}</h3>
      <p className="mb-4 text-xs text-muted">{tab==="Financeiro"?"Receitas por data de pagamento e despesas por vencimento.":tab==="Agendamentos"?"A ocupação depende da capacidade cadastrada e não é estimada aqui.":"Dados cadastrados para o mês selecionado."}</p>
      <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Indicador / Descrição</th><th className="text-right">Quantidade</th><th className="text-right">Valor</th><th>Detalhes</th></tr></thead><tbody>
        {rows.length===0?<tr><td colSpan={4} className="text-center text-muted">Nenhum registro neste período.</td></tr>:rows.map((r,i)=><tr key={i}><td className="font-medium">{r.label}</td><td className="text-right">{r.count??"—"}</td><td className="text-right">{r.value===undefined?"—":fmt(r.value)}</td><td className="text-xs text-muted">{r.detail||"—"}</td></tr>)}
      </tbody></table></div>
    </section>}
  </main>;
}
