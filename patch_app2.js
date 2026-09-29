const fs = require('fs');

let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const regexOld = /function FinishModalOld\(\{ appointment, close, done \}[\s\S]*?Processando\.\.\." : "Confirmar e concluir"\}<\/button><\/div><\/div> \n\}/;
code = code.replace(regexOld, '');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
