const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// 1. Add price to editPkg state
code = code.replace(
  'const [editPkg, setEditPkg] = useState({ name: "", total: 0, used: 0 });',
  'const [editPkg, setEditPkg] = useState({ name: "", total: 0, used: 0, price: 0 });'
);

// 2. Add price to setPackages when adding
code = code.replace(
  '{ id: Date.now().toString(), name: newPkg.name, total: newPkg.total, used: 0, created_at: new Date().toISOString() }',
  '{ id: Date.now().toString(), name: newPkg.name, total: newPkg.total, price: newPkg.price, used: 0, created_at: new Date().toISOString() }'
);

// 3. Add price input in the edit form
const oldEditForm = `<div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted">Total de Sessões</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.total} onChange={e => setEditPkg({...editPkg, total: +e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted">Sessões Usadas</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.used} onChange={e => setEditPkg({...editPkg, used: +e.target.value})} />
                          </div>
                        </div>`;

const newEditForm = `<div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted">Valor (R$)</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.price || 0} onChange={e => setEditPkg({...editPkg, price: +e.target.value})} title="A alteração aqui é apenas informativa e não altera o caixa" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted">Total Sessões</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.total} onChange={e => setEditPkg({...editPkg, total: +e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted">Usadas</label>
                            <input type="number" className="field-input !py-1 !text-sm" value={editPkg.used} onChange={e => setEditPkg({...editPkg, used: +e.target.value})} />
                          </div>
                        </div>`;

code = code.replace(oldEditForm, newEditForm);

// 4. Add price to setPackages when editing
code = code.replace(
  '{ ...pkg, name: editPkg.name, total: editPkg.total, used: editPkg.used }',
  '{ ...pkg, name: editPkg.name, total: editPkg.total, used: editPkg.used, price: editPkg.price }'
);

// 5. Add price to setEditPkg when clicking edit
code = code.replace(
  'setEditPkg({ name: p.name, total: p.total, used: p.used || 0 });',
  'setEditPkg({ name: p.name, total: p.total, used: p.used || 0, price: p.price || 0 });'
);

// 6. Display price in the normal view (under the name)
code = code.replace(
  '<p className="font-medium">{p.name}</p>',
  '<p className="font-medium">{p.name} {p.price ? <span className="text-muted font-normal ml-2">R$ {p.price.toFixed(2).replace(".",",")}</span> : null}</p>'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
