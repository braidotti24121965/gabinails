import React from "react";
import { Eye, Pencil, Trash2, Archive, LucideIcon } from "lucide-react";
import { type AppointmentStatus } from "@/lib/demo-data";

export type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "online";
export type EntityKind = "client" | "service" | "professional" | "product" | "automation" | "appointment" | "financial" | "service_consumables";
export type EntityModalState = { kind: EntityKind; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string; fullItem?: any; };

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary-light text-primary border-primary/20",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-danger border-rose-200",
    neutral: "bg-bg text-muted border-surface"
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function statusTone(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    "Pendente": "neutral", "Agendado": "primary", "Confirmado": "success", "Cliente chegou": "warning", "Em atendimento": "primary", "Concluído": "success", "Cancelado": "danger", "Não compareceu": "danger", "Aguardando sinal": "warning", "Reagendado": "primary"
  };
  return map[status] || "neutral";
}

export function Metric({ label, value, detail, icon: Icon, tone = "primary", onClick }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: string; onClick?: () => void }) {
  const content = <><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p></div><div className={`rounded-md p-2 ${tone === "danger" ? "bg-rose-50 text-danger" : tone === "warning" ? "bg-amber-50 text-warning" : "bg-primary-light text-primary"}`}><Icon size={18} strokeWidth={1.7} /></div></div><p className="mt-2 text-[11px] text-muted">{detail}</p></>;
  return onClick ? <button onClick={onClick} type="button" className="card min-w-0 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25">{content}</button> : <div className="card min-w-0">{content}</div>;
}

export function RowActions({ onView, onEdit, onDelete, deleteLabel = "Excluir" }: { onView: () => void; onEdit: () => void; onDelete: () => void; deleteLabel?: string }) {
  return <div className="flex justify-end gap-1"><button type="button" onClick={onView} className="rounded-md p-2 text-muted hover:bg-primary-light hover:text-primary" title="Visualizar" aria-label="Visualizar"><Eye size={15} /></button><button type="button" onClick={onEdit} className="rounded-md p-2 text-muted hover:bg-primary-light hover:text-primary" title="Editar" aria-label="Editar"><Pencil size={15} /></button><button type="button" onClick={onDelete} className="rounded-md p-2 text-muted hover:bg-rose-50 hover:text-danger" title={deleteLabel} aria-label={deleteLabel}>{deleteLabel === "Arquivar" ? <Archive size={15} /> : <Trash2 size={15} />}</button></div>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-base font-semibold text-ink">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>{action}</div>;
}

export function SmallMetricLink({ label, value, target, go }: { label: string; value: string; target: View; go: (view: View) => void }) {
  return <button type="button" onClick={() => go(target)} className="group flex w-full flex-col rounded-lg border border-surface bg-white p-3 text-left transition hover:border-primary/30 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/25"><span className="text-[10px] font-medium uppercase tracking-wider text-muted group-hover:text-primary">{label}</span><span className="mt-1 font-semibold text-ink">{value}</span></button>;
}
