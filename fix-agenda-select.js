const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '<select value={a.status} onChange={e => onStatusChange(a, e.target.value)} className="border border-[#E7EDF3] rounded-md px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary">';
const replacement = '<select value={a.status} onChange={e => onStatusChange(a, e.target.value)} disabled={a.status === "Concluído"} className="border border-[#E7EDF3] rounded-md px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed">';

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
