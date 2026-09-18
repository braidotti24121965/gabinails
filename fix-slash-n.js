const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.split('\\n').join('\n');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
