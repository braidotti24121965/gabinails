const fs = require('fs');
let appContent = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

appContent = appContent.replace(
  'const [productRows, setProductRows] = useState<any[]>(() => [...inventory]);',
  'const [productRows, setProductRows] = useState<any[]>(initialInventory);'
);
appContent = appContent.replace(
  'const [productRows, setProductRows] = useState(() => [...inventory]);',
  'const [productRows, setProductRows] = useState<any[]>(initialInventory);'
);

// fix Configurações click
appContent = appContent.replace(
  '<button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button>',
  '<button onClick={() => setView("services")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-white/65 hover:bg-white/10"><Settings size={16} />Configurações</button>'
);

fs.writeFileSync('src/components/nail-studio-app.tsx', appContent);
