const fs = require('fs');

let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');
code = code.replace(
  '  whitelist: boolean;\n  tag: string;\n}',
  '  whitelist: boolean;\n  tag: string;\n  activePackages?: number;\n  packageCredits?: number;\n}'
);

code = code.replace(
  '      client_deposit_whitelist (\\n        client_id,\\n        removed_at\\n      )',
  '      client_deposit_whitelist (\n        client_id,\n        removed_at\n      ),\n      packages (\n        status,\n        remaining_sessions\n      )'
);

code = code.replace(
  '      whitelist: isWhitelisted,\n      tag: isWhitelisted ? "VIP" : "Cadastrada",\n    };\n  });',
  `      whitelist: isWhitelisted,
      tag: isWhitelisted ? "VIP" : "Cadastrada",
      activePackages: item.packages?.filter(p => p.status === 'active' && p.remaining_sessions > 0).length || 0,
      packageCredits: item.packages?.filter(p => p.status === 'active').reduce((acc, p) => acc + (p.remaining_sessions || 0), 0) || 0,
    };
  });`
);
fs.writeFileSync('src/lib/actions/clients.ts', code);
