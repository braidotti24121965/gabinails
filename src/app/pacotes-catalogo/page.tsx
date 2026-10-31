"use client";

import { useEffect, useState } from "react";
import { createPackageTemplate, getPackageTemplates, setPackageTemplateActive } from "@/lib/actions/package-catalog";
import { getServices, type ServiceItem } from "@/lib/actions/services";

type Item = { serviceId: string; sessions: number };
type Template = Awaited<ReturnType<typeof getPackageTemplates>>[number];

export function PackageCatalogContent() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [validity, setValidity] = useState("");
  const [items, setItems] = useState<Item[]>([{ serviceId: "", sessions: 1 }]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() { setTemplates(await getPackageTemplates()); }
  useEffect(() => { void getServices().then(setServices); void refresh(); }, []);
  async function save() {
    setNotice("");
    setSaving(true);
    try {
      const result = await createPackageTemplate({
        name, price: Number(price), validityDays: validity ? Number(validity) : null, items
      });
      if (!result.success) { setNotice(result.error || "Não foi possível salvar."); return; }
      setName(""); setPrice(""); setValidity(""); setItems([{ serviceId: "", sessions: 1 }]);
      setNotice("Pacote cadastrado com sucesso.");
      await refresh();
    } finally { setSaving(false); }
  }
  async function toggle(id: string, active: boolean) {
    const result = await setPackageTemplateActive(id, active);
    setNotice(result.success ? "Situação atualizada." : result.error || "Erro ao atualizar.");
    await refresh();
  }
  const field = "w-full rounded-xl border border-[#e8d7cb] bg-white p-3 text-[#3d3037]";
  return <div className="p-5 text-ink md:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      
      
      <p className="text-sm">Configure pacotes vinculados aos serviços do salão. A venda e o consumo automático serão habilitados após a validação financeira.</p>
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Novo pacote</h2>
        <label className="block text-sm">Nome<input className={field} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: 4 manicures tradicionais" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Preço (R$)<input className={field} type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} /></label>
          <label className="text-sm">Validade (dias, opcional)<input className={field} type="number" min="1" value={validity} onChange={e=>setValidity(e.target.value)} /></label>
        </div>
        <h3 className="font-semibold">Serviços e sessões</h3>
        {items.map((item,i)=><div className="flex gap-3" key={i}>
          <select aria-label={"Serviço "+(i+1)} className={field} value={item.serviceId} onChange={e=>setItems(current=>current.map((v,j)=>j===i?{...v,serviceId:e.target.value}:v))}>
            <option value="">Selecione um serviço</option>
            {services.filter(s=>s.active).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
          </select>
          <input aria-label={"Sessões "+(i+1)} className="w-24 rounded-xl border p-3" type="number" min="1" value={item.sessions} onChange={e=>setItems(current=>current.map((v,j)=>j===i?{...v,sessions:Number(e.target.value)}:v))}/>
          {items.length>1 && <button type="button" onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}>Remover</button>}
        </div>)}
        <button type="button" className="rounded-xl border px-4 py-2" onClick={()=>setItems(v=>[...v,{serviceId:"",sessions:1}])}>+ Adicionar serviço</button>
        <div><button type="button" disabled={saving} onClick={()=>void save()} className="rounded-xl bg-[#834965] px-6 py-3 text-white disabled:opacity-50">{saving?"Salvando...":"Cadastrar pacote"}</button></div>
      </section>
      {notice && <p role="status" className="rounded-xl bg-white p-4">{notice}</p>}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pacotes cadastrados</h2>
        {templates.length===0 && <p>Nenhum pacote cadastrado.</p>}
        {templates.map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4">
          <div><strong>{t.name}</strong><p className="text-sm">R$ {Number(t.price).toFixed(2).replace(".",",")} · {t.package_template_items?.map(i=>i.sessions+" sessões").join(" + ")}</p><p className="text-xs">{t.active?"Ativo":"Inativo"}</p></div>
          <button type="button" className="rounded-xl border px-3 py-2" onClick={()=>void toggle(t.id,!t.active)}>{t.active?"Desativar":"Ativar"}</button>
        </div>)}
      </section>
    </div>
  </div>;
}
