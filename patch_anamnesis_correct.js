const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const regex = /let initialAnamnesis = \{ diabetes: false, gestante: false, alergias: "", roeUnha: false \};\n  let initialPackages = \[\];\n  try \{\n    if \(rawNotes\.startsWith\("\{"\)\) \{\n      const parsed = JSON\.parse\(rawNotes\);\n      if \(parsed\.anamnesis\) \{\n        initialNotes = parsed\.text \|\| "";\n        initialAnamnesis = \{ \.\.\.initialAnamnesis, \.\.\.parsed\.anamnesis \};\n      \}\n      \/\/ Removed legacy JSON packages\n    \}\n  \} catch\(e\) \{\}/;

const replace = `let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };
  let initialPackages = [];
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

code = code.replace(regex, replace);
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
