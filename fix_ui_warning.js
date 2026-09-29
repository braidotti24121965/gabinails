const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '<div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg mb-6">\n          <strong>Atenção:</strong> Ao alterar o seu e-mail, o sistema enviará um link de verificação para a sua nova caixa de entrada. Você precisará clicar nele para confirmar a troca.\n        </div>',
  '<div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-lg mb-6">\n          <strong>Livre:</strong> Você pode alterar o e-mail de acesso livremente (inclusive usar e-mails fictícios para sua equipe). A mudança é imediata e não exige confirmação externa.\n        </div>'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
