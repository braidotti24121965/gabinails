const fs = require('fs');
let code = fs.readFileSync('src/app/login/page.tsx', 'utf8');

if (!code.includes('import Link from "next/link";')) {
  code = code.replace(
    'import { login } from "@/lib/actions/auth";',
    'import { login } from "@/lib/actions/auth";\nimport Link from "next/link";'
  );
}

const formEnd = '</form>';
const linkHtml = `</form>\n\n        <div className="mt-6 text-center text-sm text-muted">\n          Não tem uma conta? <Link href="/cadastro" className="text-primary hover:underline font-medium">Cadastre seu Salão</Link>\n        </div>`;

code = code.replace(formEnd, linkHtml);
fs.writeFileSync('src/app/login/page.tsx', code);
