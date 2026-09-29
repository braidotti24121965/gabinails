const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/automations.tsx', 'utf8');

code = code.replace(
  'useEffect(() => {\n            loadData();\n  }, [loadData, tenant?.orgName]);',
  'useEffect(() => {\n    const run = async () => { await loadData(); };\n    run();\n  }, [loadData, tenant?.orgName]);'
);
fs.writeFileSync('src/components/dashboard/automations.tsx', code);
