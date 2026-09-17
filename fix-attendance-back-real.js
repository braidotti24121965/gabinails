const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'return <main className="page-content"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="primary">{appointment.status}</Badge>';
const replacement = 'return <main className="page-content"><button onClick={() => onSelect(null)} className="mb-4 text-sm font-medium text-muted hover:text-primary flex items-center gap-1">← Voltar para a lista</button><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="primary">{appointment.status}</Badge>';

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
