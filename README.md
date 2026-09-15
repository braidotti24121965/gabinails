# Gabi Ludwig Nails

MVP de homologação para a operação de um nail studio. A interface replica o Design System do projeto Haras: navegação navy, ação principal verde-petróleo, cartões compactos, bordas discretas, raio de 8px e layout responsivo.

## Executar

```bash
npm install
npm run dev
```

A raiz abre uma demonstração funcional com dados realistas. O fluxo principal pode ser testado em **Agenda → Ana Paula Souza → Concluir atendimento**. A criação de agendamento também demonstra a regra de sinal/Whitelist.

## Banco

`supabase/migrations/202609140001_initial_nail_studio.sql` contém a modelagem multi-organização, RLS, auditoria da Whitelist, snapshots de preço/comissão, finanças imutáveis por compensação, estoque por movimentos e uma exclusion constraint PostgreSQL que impede double booking no banco.

Por segurança, nenhuma migration foi aplicada e nenhum recurso Supabase foi recriado. O agendamento público não acessa tabelas diretamente; sua futura API server-side deve operar disponibilidade, hold e pagamento em transação.

## Decisões de homologação

- Sem camada comercial SaaS, planos ou superadmin.
- `organization_id` existe desde o início, embora o seed use apenas um salão.
- Profissional e usuário com login são entidades distintas.
- Atendimento concluído e pagamento recebido são estados independentes.
- Sinal é pagamento antecipado e nunca desconto.
- Pagamentos e estoque são append-only; correções geram movimentos compensatórios.
- WhatsApp opera como provider simulado e registra fila/log.
- Hold público padrão: 30 minutos, configurável por organização.
- O frontend usa dados demonstrativos locais até que as variáveis Supabase e endpoints server-side sejam homologados.
