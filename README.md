# Gabi Ludwig Nails — Documentação do Sistema

Sistema de gestão completo para o salão **Gabi Ludwig Nail Studio**, desenvolvido em Next.js (App Router), TypeScript, Tailwind CSS e Supabase.

---

## 🚀 Como Executar

```bash
npm install
npm run dev
```

Acesse em `http://localhost:3000`.

---

## 📌 Funcionalidades Principais Implementadas

### 1. 👑 Gestão de White List & Black List de Clientes
- **White List (VIP):** Clientes com isenção de sinal no agendamento online (sem exigência do relógio de 30 min).
- **Black List:** Marcação interna de clientes problemáticas.
- **Promoção Automática:** Clientes com **3 ou mais atendimentos concluídos** são promovidas automaticamente para a White List ao abrir a tela de clientes.
- **Proteção contra re-promoção:** Clientes removidas manualmente da White List recebem a flag `manually_removed = true` no banco, impedindo que entrem novamente via automação.
- **Interface Interativa:**
  - Botão de classificação individual (`VIP`, `Bloqueada`, `Normal`) com dropdown de ações rápidas.
  - Filtros por abas: `Todas | ⭐ White List (qtd) | 🚫 Black List (qtd)`.
  - Modal de confirmação explicativo para cada mudança de status.

### 2. 💰 Módulo Financeiro & DRE Simplificado
- **Seletor de Período Interativo:** Filtre os indicadores financeiros por:
  - *Hoje*
  - *Este Mês* (padrão)
  - *Mês Anterior*
  - *Últimos 30 Dias*
  - *Todo o Histórico*
- **Indicadores Chave:**
  - **Faturamento Bruto:** Consolidação dos pagamentos em caixa + valor dos serviços prestados em atendimentos concluídos no período.
  - **Despesas Fixas:** Soma de contas e despesas pagas no período.
  - **Comissões ("A repassar"):** Soma de todas as comissões geradas para a equipe no período.
  - **Lucro Líquido Real:** `Faturamento Bruto - Despesas - Comissões - Custo de Produtos`.
  - **Faturamento Futuro (Card Dedicado):** Valor total dos agendamentos futuros confirmados/pendentes + quantidade de horários + data do último agendamento na agenda.
- **DRE Simplificado & Extrato:** Demonstrativo visual e histórico de movimentações com suporte a estornos.

### 3. 📅 Agenda & Agendamento Online
- Cálculo de disponibilidade por profissional e duração do procedimento.
- Trava de horário (Hold) de 30 minutos com verificação de cliente VIP.
- Inclusão de serviços adicionais, profissional de preferência e status em tempo real.
- Baixa de atendimento atômica com cálculo automático de comissões e dedução de estoque.

---

## 🗄️ Estrutura do Banco de Dados & Migrations

- `202609140001_initial_nail_studio.sql`: Schema base multi-tenant (`organizations`, `profiles`, `professionals`, `clients`, `services`, `appointments`, `appointment_items`, `payments`, `expenses`, `commissions`, `products`, `stock_movements`, `client_deposit_whitelist`).
- `202609290001` a `202609290005`: Suporte a pacotes de sessões, fichas de anamnese, checkout atômico em transação SQL e slug padrão da organização.
- `202610020001_blacklist_and_whitelist_controls.sql`: Tabela `client_blacklist`, colunas `manually_removed` e `auto_promoted` na whitelist, e funções RPC `set_client_whitelist`, `set_client_blacklist`, `auto_promote_whitelist`.

---

## 🔐 Segurança & Multi-Tenant

- Todas as tabelas possuem **Row Level Security (RLS)** habilitado por `organization_id`.
- Acesso autenticado via Supabase SSR e Server Actions seguras.

---

## ☁️ Backup diário fora do Supabase

O repositório contém a rotina `.github/workflows/daily-database-backup.yml`. Ela roda todos os dias às **03:15 (horário de São Paulo)** e cria uma cópia da estrutura e dos dados do salão pelo exportador oficial do Supabase. O arquivo é protegido com criptografia AES-256 e guardado na pasta [Backup Gabi Nails](https://drive.google.com/drive/folders/1pCxLz0rv8oA1VQSGIbkRRlnSgB1hu6Ub). As cópias com mais de 30 dias são removidas automaticamente.

Antes da primeira execução, cadastre estes quatro segredos no repositório GitHub, em **Settings → Secrets and variables → Actions**:

| Segredo | Conteúdo |
| --- | --- |
| `SUPABASE_DB_URL` | Connection string do **Session pooler**, disponível no painel do Supabase em **Connect**. |
| `RCLONE_CONFIG_GDRIVE` | Configuração completa de um remoto `gdrive` do rclone, autenticado na conta `braidotti1965@gmail.com`. |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Senha longa, exclusiva e guardada em local seguro; ela será necessária para restaurar uma cópia. |
| `GOOGLE_DRIVE_FOLDER_ID` | `1pCxLz0rv8oA1VQSGIbkRRlnSgB1hu6Ub` |

Após cadastrar os segredos, use **Actions → Backup diário do banco → Run workflow** para executar a primeira cópia manualmente e conferir se o arquivo aparece no Drive. Nenhuma chave é gravada no código ou exibida nos logs.

## 💻 Backup semanal do sistema

O fluxo `.github/workflows/weekly-project-backup.yml` roda aos **domingos às 04:15 (horário de São Paulo)**. Ele cria uma cópia criptografada de todos os arquivos versionados do sistema: código, telas, migrations, configuração de publicação e documentação. Arquivos privados, como senhas e chaves, ficam fora da cópia. As últimas 12 semanas são mantidas na mesma pasta do Drive.

---

## 📋 Auditoria de escopo e status do MVP (31/10/2026)

Consulte [Estado atual e auditoria do MVP](docs/estado-atual-auditoria-mvp-2026-10-31.md) para a matriz de funcionalidades implementadas, evidências de testes, lacunas de validação, riscos de segurança e próximos passos. **O MVP ainda não está certificado como 100% concluído**: multi-tenant, conciliação financeira, concorrência de agenda e restauração de backup exigem validação adicional.

A documentação e as melhorias são preparadas na branch `homolog`; a produção exige autorização explícita para promoção.
