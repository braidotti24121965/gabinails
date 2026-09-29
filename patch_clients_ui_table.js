const fs = require('fs');

let code = fs.readFileSync('src/components/dashboard/clients.tsx', 'utf8');

const regex = /<p className="text-\[11px\] text-muted">\{c\.phone\}<\/p><\/button><\/td>/;
const replace = `<p className="text-[11px] text-muted">{c.phone}</p>
          {(c.packageCredits || 0) > 0 && (
            <div className="mt-1">
              <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                {c.packageCredits} {c.packageCredits === 1 ? 'crédito restante' : 'créditos restantes'}
              </span>
            </div>
          )}
        </button></td>`;
code = code.replace(regex, replace);

fs.writeFileSync('src/components/dashboard/clients.tsx', code);
