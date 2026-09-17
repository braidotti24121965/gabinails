const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix EntityModal appointment view
const oldBlock = `<div className="col-span-2"><label className="field-label">Serviço</label><input className="field-input" value={state.fullItem.service} disabled /></div>`;
const newBlock = `<div className="col-span-2"><label className="field-label">Serviços agendados</label><textarea className="field-input min-h-[60px]" value={state.fullItem.service.split(" + ").join("\\n")} disabled /></div>`;

content = content.replace(oldBlock, newBlock);

// Fix end time display just in case it's literal "Invalid Date" or "—"
content = content.replace(
  '<input className="field-input" value={state.fullItem.time + " às " + state.fullItem.end} disabled />',
  '<input className="field-input" value={state.fullItem.time + " às " + (state.fullItem.end === "Invalid Date" ? "..." : state.fullItem.end || "...")} disabled />'
);

fs.writeFileSync(path, content);
