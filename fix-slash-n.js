const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
code = code.replace('finance";\\nimport', 'finance";\nimport');
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
