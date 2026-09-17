const fs = require('fs');
const path = 'src/lib/actions/appointments.ts';
let content = fs.readFileSync(path, 'utf8');

const oldSelect = `      items:appointment_items(
        service:services(name),
        unit_price
      )`;
const newSelect = `      items:appointment_items(
        service:services(name),
        unit_price
      ),
      payments(amount)`;

content = content.replace(oldSelect, newSelect);

const oldMapping = `    const price = row.items?.reduce((acc: number, item: any) => acc + Number(item.unit_price || 0), 0) || 0;`;
const newMapping = `    const price = row.items?.reduce((acc: number, item: any) => acc + Number(item.unit_price || 0), 0) || 0;
    const paid = row.payments?.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) || 0;`;

content = content.replace(oldMapping, newMapping);

const oldReturn = `      price,
      source: row.source === "online" ? "Online" : "Interno"
    };`;
const newReturn = `      price,
      paid,
      source: row.source === "online" ? "Online" : "Interno"
    };`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync(path, content);
