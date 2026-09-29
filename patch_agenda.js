const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/agenda.tsx', 'utf8');

code = code.replace(
  'import { Plus, ArrowRight, Search, CalendarDays } from "lucide-react";',
  'import { Plus, ArrowRight, Search, CalendarDays, Activity } from "lucide-react";'
);

const extractionLogic = `
  const getMedicalAlert = (notes: string) => {
    if (!notes || !notes.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(notes);
      if (parsed.anamnesis) {
        const an = parsed.anamnesis;
        const issues = [];
        if (an.diabetes) issues.push("Diabetes");
        if (an.gestante) issues.push("Gestante");
        if (an.roeUnha) issues.push("Roe unhas");
        if (an.alergias) issues.push(\`Alergia: \${an.alergias}\`);
        if (issues.length > 0) return issues.join(" | ");
      }
    } catch(e) {}
    return null;
  };
`;

code = code.replace(
  'const visibleRows = rows.filter((r: any) => {',
  extractionLogic + '\n  const visibleRows = rows.filter((r: any) => {'
);

const badgeHtml = '{a.source === "Online" && <Badge tone="blue">Online</Badge>}';
const newBadgeHtml = badgeHtml + '\n{(() => { const alert = getMedicalAlert((a as any).clientNotes); return alert ? <span title={alert} className="cursor-help"><Badge tone="danger"><Activity size={12} className="mr-1 inline" /> Alerta Médico</Badge></span> : null; })()}';

code = code.replace(badgeHtml, newBadgeHtml);

fs.writeFileSync('src/components/dashboard/agenda.tsx', code);
