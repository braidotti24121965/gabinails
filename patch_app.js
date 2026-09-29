const fs = require('fs');

let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// Delete FinishModalOld
const regexOld = /function FinishModalOld[\s\S]*?\} \n\}/;
code = code.replace(regexOld, '');

// Rename FinishModalV2 to FinishModal
code = code.replace(/FinishModalV2/g, 'FinishModal');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
