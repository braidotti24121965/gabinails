const fs = require('fs');

let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const regexJSON = /if \(parsed\.packages\) initialPackages = parsed\.packages;/;
code = code.replace(regexJSON, '// Removed legacy JSON packages');

const regexUseEffect = /const \[packages, setPackages\] = useState\(initialPackages\);\n  const \[isAddingPackage, setIsAddingPackage\] = useState\(false\);/;
const replaceUseEffect = `const [packages, setPackages] = useState<any[]>([]);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  
  useEffect(() => {
    if (client?.id && !client.id.startsWith("demo-")) {
      import('@/lib/actions/packages').then(m => {
        m.getActivePackages(client.id).then(pkgs => {
          setPackages(pkgs);
        });
      });
    }
  }, [client?.id]);`;

code = code.replace(regexUseEffect, replaceUseEffect);

fs.writeFileSync('src/components/nail-studio-app.tsx', code);
