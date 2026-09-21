import React from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { type AppointmentStatus } from "@/lib/demo-data";
import { Home } from "lucide-react"; // for Metric

export type View = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "attendance" | "finance" | "inventory" | "automations" | "online";
export type EntityKind = "client" | "service" | "professional" | "product" | "automation" | "appointment" | "financial" | "service_consumables";
export type EntityModalState = { kind: EntityKind; mode: "view" | "edit" | "create"; index?: number; name: string; detail: string; fullItem?: any; };

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary-light/30 text-primary-dark border border-primary/20",
    success: "bg-green-100 text-green-800 border border-green-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    danger: "bg-red-100 text-red-800 border border-red-200",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
    blue: "bg-blue-100 text-blue-800 border border-blue-200"
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function statusTone(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    "Pendente": "neutral", "Agendado": "blue", "Confirmado": "success", "Cliente chegou": "warning", "Em atendimento": "primary", "Concluído": "success", "Cancelado": "danger", "Não compareceu": "danger", "Aguardando sinal": "warning", "Reagendado": "blue"
  };
  return map[status] || "neutral";
}

export function Metric({ label, value, detail, icon: Icon, tone = "primary", onClick }: { label: string; value: string; detail: string; icon: any; tone?: string; onClick?: () => void }) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary-light/20",
    success: "text-green-600 bg-green-50",
    warning: "text-amber-600 bg-amber-50",
    danger: "text-red-600 bg-red-50",
    neutral: "text-slate-600 bg-slate-50"
  };
  return (
    <div onClick={onClick} className={`card ${onClick ? 'cursor-pointer transition hover:border-primary/40 hover:shadow-sm' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-md p-2 ${tones[tone] || tones.neutral}`}><Icon size={18} /></div>
      </div>
      <p className="mt-3 text-[10px] text-muted">{detail}</p>
    </div>
  );
}

export function RowActions({ onView, onEdit, onDelete, deleteLabel = "Excluir" }: { onView: () => void; onEdit: () => void; onDelete: () => void; deleteLabel?: string }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onView} className="p-1.5 text-muted transition hover:text-ink"><Eye size={16} /></button>
      <button onClick={onEdit} className="p-1.5 text-muted transition hover:text-primary"><Edit2 size={16} /></button>
      <button onClick={onDelete} className="p-1.5 text-muted transition hover:text-red-600" title={deleteLabel}><Trash2 size={16} /></button>
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-bold text-navy-dark">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SmallMetricLink({ label, value, target, go }: { label: string; value: string; target: View; go: (view: View) => void }) {
  return (
    <button onClick={() => go(target)} className="text-left rounded-md border border-[#E7EDF3] p-3 transition hover:border-primary hover:bg-bg">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </button>
  );
}
