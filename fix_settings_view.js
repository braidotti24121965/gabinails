const fs = require('fs');
let code = fs.readFileSync('src/components/nail-studio-app.tsx', 'utf8');

code = code.replace(
  'const [savingOrg, setSavingOrg] = useState(false);\n  const [savingAccess, setSavingAccess] = useState(false);',
  'const [savingOrg, setSavingOrg] = useState(false);\n  const [savingAccess, setSavingAccess] = useState(false);\n  const [orgError, setOrgError] = useState("");\n  const [accessError, setAccessError] = useState("");'
);

code = code.replace(
  'async function handleSaveOrg() {\n    setSavingOrg(true);',
  'async function handleSaveOrg() {\n    setSavingOrg(true);\n    setOrgError("");'
);

code = code.replace(
  'async function handleSaveAccess() {\n    if (!email) return alert("E-mail não pode ser vazio");\n    setSavingAccess(true);',
  'async function handleSaveAccess() {\n    if (!email) return setAccessError("O e-mail não pode ficar vazio.");\n    setSavingAccess(true);\n    setAccessError("");'
);

code = code.replace(
  'if (res.error) {\n      alert("Erro ao atualizar credenciais: " + res.error);\n    } else {',
  'if (res.error) {\n      setAccessError(res.error);\n    } else {'
);

code = code.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">',
  '{orgError && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-100">{orgError}</div>}\n        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">'
);

code = code.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\n          <div>\n            <label className="field-label">E-mail de Login</label>',
  '{accessError && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-100">{accessError}</div>}\n        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\n          <div>\n            <label className="field-label">E-mail de Login</label>'
);


fs.writeFileSync('src/components/nail-studio-app.tsx', code);
