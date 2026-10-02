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
