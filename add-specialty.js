const fs = require('fs');

const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to use createSpecialtyRecord
content = content.replace(
  'import { getClients } from "@/lib/actions/clients";',
  'import { getClients } from "@/lib/actions/clients";\nimport { createSpecialtyRecord } from "@/lib/actions/specialties";'
);

content = content.replace(
  '{specialtiesList.length === 0 && <span className="text-xs text-muted">Nenhuma especialidade cadastrada.</span>}',
  `{specialtiesList.length === 0 && <span className="text-xs text-muted">Nenhuma especialidade cadastrada.</span>}
              {!readOnly && (
                <button
                  type="button"
                  onClick={async () => {
                    const name = window.prompt("Nome da nova especialidade:");
                    if (name && name.trim()) {
                      const res = await createSpecialtyRecord(name.trim());
                      if (res.success && res.data) {
                         // We reload the page to get the updated specialties
                         window.location.reload();
                      }
                    }
                  }}
                  className="rounded-full border border-dashed border-[#DBE3EC] px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-primary transition"
                >
                  + Nova
                </button>
              )}`
);

fs.writeFileSync(path, content);
