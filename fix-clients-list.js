const fs = require('fs');
let code = fs.readFileSync('src/lib/actions/clients.ts', 'utf8');

code = code.replace(
  'client_deposit_whitelist (',
  `appointments (
        status,
        payments (
          amount
        )
      ),
      client_deposit_whitelist (`
);

code = code.replace(
  '      visits: 1,\n      spent: 0,',
  `      visits: item.appointments?.filter(a => a.status === 'completed').length || 0,
      spent: item.appointments?.reduce((acc, a) => acc + (a.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0), 0) || 0,`
);

fs.writeFileSync('src/lib/actions/clients.ts', code);
