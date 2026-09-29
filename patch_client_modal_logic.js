const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

if (!code.includes('import { sellPackage }')) {
  code = code.replace(
    'import { getRemindersForTomorrow } from "@/lib/actions/automations";',
    'import { getRemindersForTomorrow } from "@/lib/actions/automations";\nimport { sellPackage } from "@/lib/actions/packages";'
  );
}

const oldButton = \`<button type="button" onClick={() => alert("Simulação: Pacote adicionado! (Recarregue para ver)")} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1.5">
                + Adicionar Pacote
              </button>\`;

const newButton = \`<button type="button" onClick={async () => {
                const pName = window.prompt("Nome do pacote (Ex: 4 Manicures)");
                if (!pName) return;
                const pTotal = parseInt(window.prompt("Número de sessões (Ex: 4)") || "0");
                if (!pTotal) return;
                const pPrice = parseFloat(window.prompt("Valor total (Ex: 120.00)") || "0");
                if (!pPrice) return;
                const pMethod = window.prompt("Forma de pagamento (PIX, Crédito, Débito, Dinheiro)", "PIX");
                if (!pMethod) return;
                
                const btn = e => e.target.innerText = "Processando...";
                
                const res = await sellPackage(client.id, pName, pTotal, pPrice, pMethod);
                if (res.success) {
                  setPackages([...packages, { id: Date.now().toString(), name: pName, total: pTotal, used: 0, created_at: new Date().toISOString() }]);
                  alert("Pacote adicionado com sucesso! Salve a cliente para concluir.");
                } else {
                  alert("Erro ao adicionar pacote.");
                }
              }} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1.5">
                + Adicionar Pacote
              </button>\`;

code = code.replace(oldButton, newButton);
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
