const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'const btn = e.target; btn.disabled = true; const oldTxt = btn.innerText; btn.innerText = "Processando...";',
  'const btn = e.target as HTMLButtonElement; btn.disabled = true; const oldTxt = btn.innerText; btn.innerText = "Processando...";'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
