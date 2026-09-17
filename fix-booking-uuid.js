const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'if (res.success) { setRows(v => [...v, a]);',
  'if (res.success) { setRows(v => [...v, { ...a, id: res.data.id }]);'
);

fs.writeFileSync(path, content);
