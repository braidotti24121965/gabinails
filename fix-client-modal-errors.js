const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace('Calendar,,', 'Calendar,');

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
