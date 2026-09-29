const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

// The injected code at the top is exactly this:
const topStr = `let initialAnamnesis = { diabetes: false, gestante: false, alergias: "", roeUnha: false };
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

if (code.startsWith(topStr)) {
  code = code.substring(topStr.length);
}

// Then we need to inject it AT THE RIGHT PLACE!
// In ClientModal, after `const [anamnesis, setAnamnesis] = useState(initialAnamnesis);`
// Actually wait! If I just delete it from the top, I STILL need to inject it in ClientModal!

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
