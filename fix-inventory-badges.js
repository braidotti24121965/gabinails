const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'function Inventory({ data, onNew, onAction, onDelete }: { data: typeof inventory; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { return <main className="page-content"><div className="mb-5 flex flex-wrap justify-between gap-3"><div className="flex gap-2"><Badge tone="danger">2 abaixo do mínimo</Badge><Badge tone="warning">3 com déficit previsto</Badge></div>',
  `function Inventory({ data, onNew, onAction, onDelete }: { data: any[]; onNew: () => void; onAction: (mode: "view" | "edit", index: number) => void; onDelete: (index: number) => void }) { 
    const belowMin = data.filter(i => i.stock < i.minimum).length;
    const withDeficit = data.filter(i => (i.stock - (i.forecast || 0)) < 0).length;
    return <main className="page-content"><div className="mb-5 flex flex-wrap justify-between gap-3"><div className="flex gap-2">
    {belowMin > 0 && <Badge tone="danger">{belowMin} abaixo do mínimo</Badge>}
    {withDeficit > 0 && <Badge tone="warning">{withDeficit} com déficit previsto</Badge>}
    </div>`
);

code = code.replace(
  '<div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Previsão de consumo</p><p className="mt-1 text-xs">Os próximos agendamentos exigem 42 lixas; o estoque atual é 30. Inclua 12 unidades na lista de reposição.</p></div>',
  '{withDeficit > 0 && <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Atenção ao estoque</p><p className="mt-1 text-xs">Existem itens que ficarão abaixo do necessário para os próximos agendamentos previstos. Providencie a reposição.</p></div>}'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
