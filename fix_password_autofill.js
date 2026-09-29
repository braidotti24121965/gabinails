const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '<input type="password" placeholder="••••••••" className="field-input" value={password} onChange={e => setPassword(e.target.value)} />',
  '<input type="password" placeholder="••••••••" className="field-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
