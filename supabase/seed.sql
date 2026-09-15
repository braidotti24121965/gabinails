-- Massa demonstrativa idempotente para homologação (sem criar usuários de Auth).
insert into public.organizations (id, name, slug, timezone, booking_hold_minutes)
values ('11111111-1111-4111-8111-111111111111', 'Gabi Ludwig Nail Studio', 'gabi-ludwig', 'America/Sao_Paulo', 30)
on conflict (id) do nothing;

insert into public.professionals (id, organization_id, name, phone, email, specialties, default_commission) values
('21111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Gabi Ludwig','5551999123044','gabi@example.com',array['Gel','Nail art'],40),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Júlia Mendes','5551991038872','julia@example.com',array['Fibra','Gel'],35),
('23333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Camila Rocha','5551998412210','camila@example.com',array['Pedicure','Spa'],35),
('24444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Nina Duarte','5551997421733','nina@example.com',array['Manicure','Blindagem'],35)
on conflict (organization_id, email) do nothing;

insert into public.services (id, organization_id, category, name, duration_minutes, price, maintenance_days, commission_value, deposit_type, deposit_value) values
('31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Alongamento','Alongamento em gel',90,185,21,40,'fixed',30),
('32222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Manutenção','Manutenção em gel',60,130,21,35,'fixed',30),
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Esmaltação','Esmaltação em gel',45,85,18,35,'fixed',25),
('34444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Tratamento','Blindagem',60,115,21,35,'fixed',30),
('35555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','Mãos','Manicure tradicional',35,45,10,35,'fixed',15),
('36666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','Pés','Pedicure',45,55,15,35,'fixed',15),
('37777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','Pés','Spa dos pés',40,65,20,35,'fixed',20),
('38888888-8888-4888-8888-888888888888','11111111-1111-4111-8111-111111111111','Adicional','Nail art premium',30,50,null,35,'fixed',15),
('39999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','Combo','Manicure + pedicure',75,92,14,35,'fixed',25),
('30000000-0000-4000-8000-000000000000','11111111-1111-4111-8111-111111111111','Combo','Spa dos pés + pedicure',60,105,18,35,'fixed',30)
on conflict (organization_id, name) do nothing;

insert into public.clients (id, organization_id, name, phone, phone_normalized, birth_date, source, marketing_consent, status)
select ('40000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, '11111111-1111-4111-8111-111111111111',
  (array['Mariana Costa','Ana Paula Souza','Clara Martins','Beatriz Alves','Fernanda Lima','Luiza Torres','Paula Nunes','Renata Freire','Isabela Moraes','Sofia Ribeiro'])[1 + ((n-1) % 10)] || case when n > 10 then ' ' || n else '' end,
  '+5551999' || lpad(n::text,6,'0'), '5551999' || lpad(n::text,6,'0'), (date '1988-01-01' + n * 41),
  (array['Instagram','Indicação','WhatsApp','Google'])[1 + ((n-1) % 4)], n % 3 <> 0, case when n in (7,17,27) then 'archived' else 'active' end
from generate_series(1,30) n on conflict (organization_id, phone_normalized) do nothing;

insert into public.products (id, organization_id, name, category, base_unit, minimum_stock, ideal_stock, unit_cost, supplier) values
('51111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Lixa banana 100/180','Descartáveis','unit',25,60,1.90,'Bella Pro'),
('52222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Base gel construtora','Gel','ml',80,200,1.15,'Nail Supply'),
('53333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Prep desidratador','Preparação','ml',50,120,.82,'Nail Supply'),
('54444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Luvas nitrílicas','Descartáveis','unit',40,100,.48,'Med Clean'),
('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','Óleo de cutícula','Finalização','ml',40,100,.70,'Bella Pro')
on conflict (organization_id, name) do nothing;

insert into public.stock_movements (organization_id, product_id, movement_type, quantity, source, unit_cost)
select '11111111-1111-4111-8111-111111111111', id, 'purchase',
  case name when 'Lixa banana 100/180' then 30 when 'Base gel construtora' then 110 when 'Prep desidratador' then 42 when 'Luvas nitrílicas' then 24 else 76 end,
  'Estoque inicial de homologação', unit_cost from public.products where organization_id='11111111-1111-4111-8111-111111111111'
and not exists (select 1 from public.stock_movements where organization_id='11111111-1111-4111-8111-111111111111');

insert into public.expenses (organization_id, description, category, competence_date, due_date, paid_at, amount, status, payment_method) values
('11111111-1111-4111-8111-111111111111','Aluguel do espaço','Fixo','2026-09-01','2026-09-05','2026-09-05',3200,'paid','pix'),
('11111111-1111-4111-8111-111111111111','Compra de materiais','Insumos','2026-09-01','2026-09-18',null,1280,'pending','credit'),
('11111111-1111-4111-8111-111111111111','Energia elétrica','Fixo','2026-09-01','2026-09-20',null,460,'pending','pix');

-- A Whitelist requer um usuário real em auth.users para preservar a auditoria. Após o primeiro
-- login administrativo, insira as cinco clientes desejadas usando o id desse usuário em authorized_by.
