# Módulo de Estoque (Inventory)

## Passo 1: Tabelas do Banco de Dados
A migração `202609170001_create_inventory.sql` já foi criada. Ela precisa ser executada no Supabase SQL Editor.
- `products`: Produtos do estoque.
- `inventory_transactions`: Entradas e saídas.
- `service_products`: Vínculo entre serviços e produtos (para baixa automática).

## Passo 2: Server Actions
Criar `src/lib/actions/inventory.ts`:
- `getInventory()`: Busca a lista de produtos calculando o saldo real (`SUM(quantity)` das transações).
- `createProduct()`, `updateProduct()`: Gerenciar produtos.
- `addTransaction()`: Adicionar entrada manual ou ajuste.

## Passo 3: Tela de Estoque
- Modificar `page.tsx` para injetar `getInventory()` no `NailStudioApp`.
- Atualizar o componente `<Inventory>` para renderizar os produtos reais.
- Substituir o array falso `inventory` pelo real.

## Passo 4: Baixa Automática no Atendimento
- Em `finishAppointment` (`src/lib/actions/attendance.ts`), quando concluir um agendamento:
  1. Descobrir todos os `service_products` dos serviços que estão no agendamento.
  2. Criar uma `inventory_transaction` com type `out` (saída) para cada produto, na quantidade correta.

Aguardando usuário executar a migração no Supabase.
