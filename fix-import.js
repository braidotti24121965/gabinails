const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { createSpecialtyRecord }')) {
  content = content.replace(
    'import { createProfessionalRecord, updateProfessionalRecord, archiveProfessionalRecord, type ProfessionalItem } from "@/lib/actions/professionals";',
    'import { createProfessionalRecord, updateProfessionalRecord, archiveProfessionalRecord, type ProfessionalItem } from "@/lib/actions/professionals";\nimport { createSpecialtyRecord } from "@/lib/actions/specialties";'
  );
  fs.writeFileSync(path, content);
}
