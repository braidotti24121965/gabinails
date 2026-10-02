# Documentação Técnica e Regras de Negócio — Gabi Ludwig Nails

Este documento descreve detalhadamente a arquitetura, regras de negócio e especificações do sistema **Gabi Ludwig Nails**.

---

## 1. Classificação de Clientes (White List & Black List)

### 1.1 White List (Clientes VIP)
- **Definição:** Cliente isenta de sinal para agendamento online.
- **Comportamento no Agendamento Online:**
  - O sistema detecta o telefone da cliente.
  - Se estiver na White List, não exige PIX prévio de sinal nem ativa a contagem regressiva de 30 minutos.
  - A reserva é confirmada diretamente.
- **Promoção Automática:**
  - Regra: Cliente que completar **3 ou mais atendimentos com status `completed`** é qualificada para a White List.
  - Gatilho: A função `runAutoPromoteWhitelist(3)` é disparada ao visualizar a tela de clientes.
  - Sinalização visual: Clientes promovidas automaticamente exibem um ícone de estrela ✨ no badge VIP.
- **Remoção Manual:**
  - Ao remover manualmente uma cliente da White List, a coluna `manually_removed` é definida como `true`.
  - Esta flag garante que a promoção automática não voltará a incluir a cliente na White List em visitas subsequentes.

### 1.2 Black List (Bloqueio / Restrição Interna)
- **Definição:** Registro de cliente com restrições ou histórico de problemas.
- **Comportamento:**
  - Cliente é visualmente sinalizada na lista com o badge vermelho `Bloqueada`.
  - Ela é impedida de entrar na White List automática.
  - No agendamento online, ela segue o fluxo padrão com exigência do sinal PIX de 30 minutos.
- **Tabela:** `client_blacklist` com colunas `client_id`, `organization_id`, `reason`, `blocked_by`, `blocked_at`, `removed_by`, `removed_at`.

---

## 2. Módulo Financeiro & Indicadores

### 2.1 Seleção de Período
A tela do Financeiro permite filtrar dados pelos seguintes períodos:
1. `today` (Hoje): Transações e atendimentos do dia.
2. `month` (Este Mês - Padrão): Transações do 1º ao último dia do mês corrente.
3. `last_month` (Mês Anterior): Fechamento financeiro do mês imediatamente anterior.
4. `30days` (Últimos 30 dias): Janela de 30 dias passados a partir da data atual.
5. `all` (Todo o histórico): Acumulado de todas as operações registradas no sistema.

### 2.2 Fórmulas dos Indicadores
- **Faturamento Bruto:**
  $$\text{Faturamento Bruto} = \text{Recebimentos de Caixa (Pagamentos)} + \text{Diferença positiva de Atendimentos Concluídos} - \text{Estornos/Chargebacks}$$
- **Despesas Fixas:**
  Soma de lançamentos na tabela `expenses` com `status = 'paid'` no período.
- **Comissões ("A repassar"):**
  Soma de todas as comissões geradas na tabela `commissions` no período (`status = 'generated' | 'closed' | 'paid'`).
- **Lucro Líquido Real:**
  $$\text{Lucro Líquido} = \text{Faturamento Bruto} - \text{Despesas} - \text{Comissões} - \text{Custo de Estoque Consumido}$$
- **Faturamento Futuro:**
  Soma dos valores de todos os procedimentos agendados para datas futuras com status ativo (`pending`, `awaiting_deposit`, `scheduled`, `confirmed`).
  Exibe também o número de agendamentos e a data do último agendamento futuro na agenda.

---

## 3. Resumo de Migrations SQL

| Migration | Conteúdo |
|---|---|
| `202609140001_initial_nail_studio.sql` | Schema inicial: organizações, perfis, profissionais, clientes, serviços, agendamentos, pagamentos, despesas, comissões, estoque, whitelist base |
| `202609150001_create_specialties.sql` | Especialidades de profissionais |
| `202609170001` a `20260921000007` | Ajustes de RLS, buckets de fotos e transações de agendamento |
| `202609290001` a `202609290005` | Suporte a pacotes, fichas de anamnese e RPCs de checkout atômico |
| `202610020001_blacklist_and_whitelist_controls.sql` | Tabela `client_blacklist`, colunas de controle `manually_removed` e `auto_promoted`, e RPCs `set_client_whitelist`, `set_client_blacklist`, `auto_promote_whitelist` |

---

## 4. Estado Atual e Segurança

- Todo o código está compilando sem erros no TypeScript (`npx tsc --noEmit`).
- Todas as alterações foram sincronizadas e aplicadas no banco Supabase de produção via `supabase db push`.
- As modificações foram consolidadas e enviadas para a branch `main` no GitHub.
