const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<select 
       value={a.status}
       onClick={(e) => e.stopPropagation()} 
       onChange={(e) => onStatusChange(a, e.target.value)}
       className="field-input !py-1 !text-xs !h-8 w-32"
     >`;

const replacement = `<select 
       value={a.status}
       disabled={a.status === "Concluído"}
       onClick={(e) => e.stopPropagation()} 
       onChange={(e) => onStatusChange(a, e.target.value)}
       className="field-input !py-1 !text-xs !h-8 w-32 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
     >`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
