const fs = require('fs');

let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

const regexSubmit = /const \{ updatePackage, getActivePackages \} = await import\("@\/lib\/actions\/packages"\);\n                              await updatePackage\(p\.id, editPkg\.name, editPkg\.total, editPkg\.used\);/;

const replaceSubmit = `if (editPkg.used < 0 || editPkg.used > editPkg.total) {
                                alert("O número de sessões restantes não pode ser negativo nem maior que o total.");
                                return;
                              }
                              const { updatePackage, getActivePackages } = await import("@/lib/actions/packages");
                              await updatePackage(p.id, editPkg.name, editPkg.total, editPkg.used);`;

code = code.replace(regexSubmit, replaceSubmit);
fs.writeFileSync('src/components/nail-studio-app.tsx', code);
