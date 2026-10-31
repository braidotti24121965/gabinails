# Gabi Nails — Auditoria financeira inicial (homologação)

Data: 31/10/2026. Escopo: inspeção estática de `src/lib/actions/finance.ts`, `src/lib/actions/appointments.ts` e estrutura de `payments`, `packages`, `package_sessions`, `checkout_corrections` no Supabase de homologação.

## Achados

1. **Cobertura por pacote — atenção a serviços mistos.** Em `getAppointments`, `coveredByPackage` é verdadeiro quando existe qualquer sessão `used` associada ao atendimento. É necessário verificar se o cálculo apresentado desconta corretamente apenas serviços efetivamente cobertos, especialmente com múltiplos itens. Risco identificado por leitura do código; não comprovado com teste funcional.
2. **Estorno — validação insuficiente na Server Action.** `reversePayment(paymentId)` faz `UPDATE payments SET status='refunded'` por id e organização. A função não exige justificativa, não restringe o status anterior e não grava explicitamente trilha de auditoria. Verificar controles de interface/RLS e regras adicionais antes de propor alteração.
3. **Recebimento antecipado — possível concorrência.** `registerAdvancePayment` calcula o saldo por consulta prévia aos pagamentos. Duas solicitações simultâneas exigem teste para assegurar que não ultrapassem o total.
4. **Conciliação e correção de fechamento.** Existem tabelas `checkout_corrections`, `package_sessions` e `payments`, mas é necessário validar atomicidade, rastreabilidade e consistência entre totais e sessões remanescentes.

## Testes necessários antes de alterar regras financeiras

- Atendimento exclusivamente coberto por pacote: saldo final zero, sem cobrança duplicada.
- Atendimento misto (serviço do pacote + adicional avulso): cobrar apenas o adicional.
- Pagamento parcial e complemento: saldo correto em cada etapa.
- Estorno de pagamento: impedir repetição indevida, preservar histórico e conferir reflexo no relatório.
- Correção de fechamento: validar autorização, motivo, auditoria e reflexo no pacote.
- Duas tentativas simultâneas de pagamento antecipado: não exceder saldo.
- Isolamento por organização em todos os cenários.

## Critério de aceite
Cada teste deve registrar valor esperado, valor exibido, movimentações em banco e resultado. Não alterar produção sem autorização expressa. **Nenhuma inconsistência de dados foi afirmada ou corrigida nesta inspeção.**
