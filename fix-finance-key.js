const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  '<tbody>{data.map((item, index) => <tr key={`${item.date}-${item.name}`}><td>{item.date}</td><td>',
  '<tbody>{data.map((item, index) => <tr key={`${item.date}-${item.name}-${index}`}><td>{item.date}</td><td>'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
