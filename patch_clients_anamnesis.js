const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');

code = code.replace(
  'client_deposit_whitelist (\\n        client_id,\\n        removed_at\\n      ),',
  'client_deposit_whitelist (\\n        client_id,\\n        removed_at\\n      ),\\n      client_anamnesis (\\n        diabetes,\\n        pregnant,\\n        nail_biting,\\n        allergies\\n      ),'
);

fs.writeFileSync('src/lib/actions/clients.ts', code);

let appCode = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');
const regexAnamnesis = /let initialAnamnesis = \{ diabetes: false, gestante: false, alergias: "", roeUnha: false \};\n  try \{\n    if \(rawNotes\.startsWith\("\{"\)\) \{\n      const parsed = JSON\.parse\(rawNotes\);\n      if \(parsed\.anamnesis\) \{\n        initialNotes = parsed\.text || "";\n        initialAnamnesis = \{ \.\.\.initialAnamnesis, \.\.\.parsed\.anamnesis \};\n      \}\n    \}\n  \} catch\(e\) \{\}/;

const replaceAnamnesis = `let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };
  try {
    if (rawNotes.startsWith("{")) {
      const parsed = JSON.parse(rawNotes);
      if (parsed.anamnesis) {
        initialNotes = parsed.text || "";
        initialAnamnesis = { ...initialAnamnesis, ...parsed.anamnesis };
      }
    }
  } catch(e) {}
  
  // Prefer relational anamnesis if it exists
  if (client?.client_anamnesis && client.client_anamnesis.length > 0) {
    const an = client.client_anamnesis[0];
    initialAnamnesis = {
      diabetes: an.diabetes,
      gestante: an.pregnant,
      roeUnha: an.nail_biting,
      alergias: an.allergies || ""
    };
  }`;

appCode = appCode.replace(regexAnamnesis, replaceAnamnesis);
fs.writeFileSync('src/components/nail-studio-app.tsx', appCode);
