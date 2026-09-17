const fs = require('fs');
const path = 'src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { getServices }')) {
  content = content.replace(
    'import { getAppointments } from "@/lib/actions/appointments";',
    'import { getAppointments } from "@/lib/actions/appointments";\nimport { getServices } from "@/lib/actions/services";'
  );
  
  content = content.replace(
    'const appointments = await getAppointments();',
    'const appointments = await getAppointments();\n  const services = await getServices();'
  );
  
  content = content.replace(
    'initialAppointments={appointments}',
    'initialAppointments={appointments}\n    initialServices={services}'
  );
  
  fs.writeFileSync(path, content);
}
