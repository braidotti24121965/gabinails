const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '<button onClick={onFinish} className="btn-primary"><Check size={16} />Concluir atendimento</button>';
const replacement = '<button onClick={onFinish} disabled={appointment.status !== "Em atendimento"} className={`btn-primary ${appointment.status !== "Em atendimento" ? "opacity-50 cursor-not-allowed" : ""}`} title={appointment.status !== "Em atendimento" ? "Mude o status para Em atendimento para concluir" : ""}><Check size={16} />Concluir atendimento</button>';

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
