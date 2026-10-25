"use client";
import { useCallback, useEffect, useState } from "react";
import { createCatalogExpense, getExpenseTemplates, saveExpenseTemplate, updateExpenseRecord } from "@/lib/actions/finance";

type Template = { id: string; name: string; category: string; default_amount: number | null; active: boolean };
type Expense = { id: string; name: string; value: number; dueDate?: string; templateId?: string; status: string };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export function ExpenseManager({ close, saved, expense }: { close: () => void; saved: () => void; expense?: Expense }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState(expense?.templateId || "");
  const [amount, setAmount] = useState(expense ? String(Math.abs(expense.value)) : "");
  const [date, setDate] = useState(expense?.dueDate || today());
  const [paid, setPaid] = useState(expense?.status === "Pago" || !expense);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Geral");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const res = await getExpenseTemplates();
    if (res.error) setError(res.error); else setTemplates(res.data as Template[]);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const editTemplate = (t: Template | "new") => {
    setEditing(t); setName(t === "new" ? "" : t.name); setCategory(t === "new" ? "Geral" : t.category);
    setDefaultAmount(t === "new" ? "" : String(t.default_amount ?? "")); setActive(t === "new" ? true : t.active); setError("");
  };
  const saveTemplate = async () => {
    const parsed = defaultAmount.trim() ? Number(defaultAmount.replace(",", ".")) : null;
    setBusy(true); setError("");
    const res = await saveExpenseTemplate({ id: editing && editing !== "new" ? editing.id : undefined, name, category, defaultAmount: parsed, active });
    setBusy(false);
    if (!res.success) { setError(res.error || "Erro ao salvar."); return; }
    await refresh();
    setEditing(null);
  };
  const submit = async () => {
    if (!expense && !selected) { setError("Selecione uma despesa cadastrada."); return; }
    const value = Number(amount.replace(",", "."));
    setBusy(true); setError("");
    const result = expense
      ? await updateExpenseRecord({ id: expense.id, amount: value, dueDate: date, paid, templateId: selected || undefined })
      : await createCatalogExpense({ templateId: selected, amount: value, dueDate: date, paid });
    setBusy(false);
    if (!result.success) { setError(result.error || "Não foi possível salvar."); return; }
    saved(); close();
  };
  const choose = (id: string) => {
    setSelected(id);
    const t = templates.find(item => item.id === id);
    if (t?.default_amount != null) setAmount(String(t.default_amount));
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Fechar" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Lançamento de despesa" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{expense ? "Editar despesa" : "Novo lançamento de despesa"}</h2>
          <button type="button" onClick={close} className="btn-outline">Fechar</button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Selecione uma despesa padronizada ou administre o catálogo.</p>
        {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {editing ? (
          <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">{editing === "new" ? "Cadastrar despesa fixa" : "Editar despesa cadastrada"}</h3>
            <label className="block text-sm">Descrição<input className="field-input mt-1" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
            <label className="block text-sm">Categoria<input className="field-input mt-1" value={category} onChange={e => setCategory(e.target.value)} /></label>
            <label className="block text-sm">Valor padrão (opcional)<input type="number" min="0.01" step="0.01" className="field-input mt-1" value={defaultAmount} onChange={e => setDefaultAmount(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />Ativa para novos lançamentos</label>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={saveTemplate}>Salvar cadastro</button>
              <button type="button" className="btn-outline" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Despesa fixa
              <select className="field-input mt-1" value={selected} onChange={e => choose(e.target.value)}>
                <option value="">{expense ? "Manter a descrição original" : "Selecione uma despesa"}</option>
                {templates.filter(t => t.active || t.id === selected).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline" onClick={() => editTemplate("new")}>+ Cadastrar nova</button>
              {selected && <button type="button" className="btn-outline" onClick={() => { const t = templates.find(t => t.id === selected); if (t) editTemplate(t); }}>Editar cadastro</button>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Valor (R$)<input className="field-input mt-1" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
              <label className="block text-sm font-medium">Vencimento<input className="field-input mt-1" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} />Despesa já paga</label>
            <p className="text-xs text-slate-500">Alterar um cadastro não renomeia lançamentos anteriores. Valores e vencimentos podem variar a cada lançamento.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={close}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={busy} onClick={submit}>{busy ? "Salvando..." : "Salvar lançamento"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
