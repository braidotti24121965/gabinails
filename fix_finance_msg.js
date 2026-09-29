const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/finance.tsx', 'utf8');

const oldMsg = `<p className="text-xs text-emerald-700 text-center">
              Você está tendo um desempenho incrível e sobrando caixa no final do mês.
            </p>`;

const newMsg = `{financeStats?.balance >= 0 ? (
              <p className="text-xs text-emerald-700 text-center">Você está com saldo positivo neste período. Excelente!</p>
            ) : (
              <p className="text-xs text-red-700 text-center">Atenção: O saldo está negativo neste período.</p>
            )}`;

code = code.replace(oldMsg, newMsg);

// Also change the background color of the box to red if negative
const oldBox = `<div className="mt-6 rounded-md bg-emerald-50 border border-emerald-100 p-4">`;
const newBox = `<div className={\`mt-6 rounded-md border p-4 \${financeStats?.balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}\`}>`;

code = code.replace(oldBox, newBox);
fs.writeFileSync('src/components/dashboard/finance.tsx', code);
