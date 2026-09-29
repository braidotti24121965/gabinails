const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '<input type="number" className="field-input !py-1 !text-sm" value={editPkg.price || 0} onChange={e => setEditPkg({...editPkg, price: +e.target.value})} title="A alteração aqui é apenas informativa e não altera o caixa" />',
  '<input type="number" className="field-input !py-1 !text-sm bg-gray-50" value={editPkg.price || 0} disabled title="O valor não pode ser alterado após a venda. Faça um estorno no financeiro se necessário." />'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
