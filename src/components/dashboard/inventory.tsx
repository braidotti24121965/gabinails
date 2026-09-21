import React from "react";
import { Plus } from "lucide-react";
import { Badge, RowActions } from "../nail-studio-app";
import { money } from "@/lib/demo-data";

export function Inventory({ data, onNew, onAction, onDelete }: { data: any[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { 
    const belowMin = data.filter(i => i.stock < i.minimum).length;
    const withDeficit = data.filter(i => (i.stock - (i.forecast || 0)) < 0).length;
    return <main className="page-content"><div className="mb-5 flex flex-wrap justify-between gap-3"><div className="flex gap-2">
    {belowMin > 0 && <Badge tone="danger">{belowMin} abaixo do mínimo</Badge>}
    {withDeficit > 0 && <Badge tone="warning">{withDeficit} com déficit previsto</Badge>}
    </div><button onClick={onNew} className="btn-primary"><Plus size={16} />Novo produto / movimento</button></div><section className="card !p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Produto</th><th>Saldo atual</th><th>Mínimo / Ideal</th><th>Demanda futura</th><th>Previsão</th><th>Custo unitário</th><th className="text-right">Ações</th></tr></thead><tbody>{data.map((i, index) => { const deficit = i.stock - i.forecast; return <tr key={i.product}><td><button onClick={() => onAction("view", index)} className="font-medium hover:text-primary">{i.product}</button></td><td>{i.stock} {i.unit}</td><td>{i.minimum} / {i.ideal} {i.unit}</td><td>{i.forecast} {i.unit}</td><td>{deficit < 0 ? <Badge tone="danger">Déficit de {Math.abs(deficit)} {i.unit}</Badge> : <Badge tone="success">Suficiente</Badge>}</td><td>{money.format(i.cost)}</td><td><RowActions onView={() => onAction("view", index)} onEdit={() => onAction("edit", index)} onDelete={() => onDelete(index)} /></td></tr>})}</tbody></table></div></section>{withDeficit > 0 && <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Atenção ao estoque</p><p className="mt-1 text-xs">Existem itens que ficarão abaixo do necessário para os próximos agendamentos previstos. Providencie a reposição.</p></div>}</main> }

