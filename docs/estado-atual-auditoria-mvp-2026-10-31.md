# Gabi Nails — Estado atual e auditoria do MVP

**Data da revisão:** 31/10/2026  
**Ambiente de referência:** branch `homolog`, Vercel `gabinails-homolog`, Supabase `pnvhqvspziujrpagsclx`.  
**Produção:** branch `main`, Vercel `gabinails`, Supabase `qcltxqnocckbkabcuoqr`. **Nenhuma alteração de produção nesta revisão.**

## Critério de evidência
- **Implementado (código):** interface, Server Action ou estrutura de banco identificada; não significa teste funcional aprovado.
- **Validado manualmente:** cenário executado pelo responsável e resultado confirmado por captura/relato.
- **Pendente:** requisito ou comportamento sem evidência suficiente para aprovação.
- **MVP original:** não foi localizado um documento de aceite com requisitos numerados no caminho `MVP.md` ou `docs/MVP.md`. Esta matriz é uma **reconstrução a partir do README e implementação atual**, não uma certificação de aderência a um escopo original desconhecido.

## Matriz de aderência do MVP

| Área / requisito | Evidência encontrada | Situação |
|---|---|---|
| Autenticação e sessão | `src/app/page.tsx` protege rota e usa Supabase Auth | Implementado; testes de perfis pendentes |
| Contexto de organização | `profiles.organization_id`, `organizations`, consulta no carregamento | Implementado; isolamento multi-tenant não homologado |
| Clientes | Tabelas `clients`, `client_blacklist`, `client_deposit_whitelist` e interface principal | Implementado; fluxos completos não retestados |
| Profissionais, serviços e especialidades | Tabelas `professionals`, `services`, `specialties`, `professional_services` | Implementado; testes pendentes |
| Agenda e cadastro/edição | `src/lib/actions/appointments.ts` | **Validado manualmente:** horário livre, bloqueio, edição bloqueada e sobreposição |
| Bloqueio parcial e integral | `professional_availability` e ações de bloqueio | Validado nos cenários de conflito relatados; concorrência simultânea pendente |
| Reserva online e sinal | Funcionalidade descrita no `README.md` | Declarada; validar hold, expiração, sinal, VIP e ponta a ponta |
| Pacotes e sessões | Tabelas `packages` e `package_sessions` | Implementado; conciliação e casos mistos pendentes |
| Checkout e pagamentos | `payments`, `commissions`, `checkout_corrections` | Implementado; auditoria financeira e regressão pendentes |
| Correção de fechamento | `checkout_corrections` e políticas RLS | Implementado; validação de permissões por usuário pendente |
| Financeiro e despesas recorrentes | `src/lib/actions/finance.ts`: `getFinance`, `ensureRecurringExpenses`, `markExpensePaid`, `reversePayment` | Implementado; conciliação e períodos pendentes |
| Relatórios | `src/lib/actions/reports.ts` e interface | Implementado; validação de valores e filtros pendente |
| Estoque e consumíveis | `products`, `stock_movements`, `service_consumables` | Implementado estruturalmente; baixa e estorno pendentes |
| Anamnese e fotos | `client_anamnesis`, `client_photos` | Implementado estruturalmente; teste de acesso pendente |
| Mensagens | `message_jobs`, `message_templates` | Estrutura presente; entrega efetiva não comprovada |
| Backup | Workflows descritos no README | Configuração declarada; execução/restauração não verificadas |
| Superadministrador e múltiplos salões | Organização no banco, perfil associado à organização | **Pendente:** gestão de vários salões, alternância, administradores por salão |
| Usuário operacional restrito | RLS e perfis no banco | **Pendente:** matriz de permissões e testes com identidades reais |

## Banco e segurança
- Homologação: **26 tabelas públicas**, conferidas em `information_schema.tables`.
- Política `checkout_corrections_select_org` ajustada em homologação para leitura por `admin`, `owner` ou `manager` da mesma organização.
- A contagem de políticas RLS por si só não comprova equivalência entre ambientes. Produção e homologação possuem diferenças de políticas e histórico de branches; não copiar automaticamente esquemas ou dados.
- A restrição de exclusão `appointments_no_overlap` existe no banco de homologação para status ativos da mesma profissional. A verificação de bloqueios no código não substitui teste de concorrência ou uma proteção transacional integrada a `professional_availability`.

## Testes funcionais confirmados em homologação
1. Criar agendamento em horário bloqueado → recusado.
2. Editar agendamento para horário bloqueado → recusado.
3. Criar agendamento sobreposto para mesma profissional → recusado.
4. Criar agendamento em horário livre → aprovado conforme confirmação do responsável.

**Não executados nesta auditoria:** testes automatizados, concorrência real, financeiro/pacotes ponta a ponta, perfis multi-tenant, restauração de backup e testes de regressão completos.

## Pendências prioritárias
1. **P0 — Segurança de ambientes:** confirmar vínculo da branch `homolog` exclusivamente ao projeto de homologação, variáveis Supabase e procedimento de promoção controlada.
2. **P0 — Integridade da agenda:** testar concorrência simultânea, cancelamentos, remarcações e interação entre bloqueios e agendamentos.
3. **P1 — Conciliação financeira:** conferir pagamentos, pacotes, correções, estornos, comissões, despesas recorrentes e relatórios com cenários reproduzíveis.
4. **P1 — Multi-tenant:** criar duas organizações de teste, administradores separados e usuário operacional restrito; verificar isolamento de dados e permissões no banco e na interface.
5. **P1 — Mensageria e backup:** verificar execução real de jobs, workflows e restauração.
6. **P2 — UX e observabilidade:** revisar erros de interface, notificações e logs de operações sensíveis.

## Decisão de aceite
**MVP não pode ser declarado 100% concluído nesta data.** Existem componentes implementados, mas faltam evidências funcionais para requisitos críticos, principalmente multi-tenant, financeiro, backups e segurança operacional. Esta conclusão não significa que tais funcionalidades estejam ausentes; significa que ainda não foram integralmente verificadas.

## Processo de mudanças
- Desenvolver e documentar em `homolog`; validar na Vercel e Supabase de homologação.
- Publicar em `main` e alterar Supabase de produção **somente após autorização explícita** e revisão de migrations, variáveis, impacto e rollback.
