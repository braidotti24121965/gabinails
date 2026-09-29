const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(
  '    tenantContext.email = user.email || "";\n    if (!user) {\n      redirect("/login");\n    }',
  '    if (!user) {\n      redirect("/login");\n    }\n    tenantContext.email = user.email || "";'
);

fs.writeFileSync('src/app/page.tsx', code);
