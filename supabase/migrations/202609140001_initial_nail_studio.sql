-- Gabi Ludwig Nails — schema inicial para homologação.
-- Todos os registros de negócio já carregam organization_id para evolução multi-tenant.
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.appointment_status as enum ('pending','awaiting_deposit','scheduled','confirmed','arrived','in_progress','completed','rescheduled','cancelled','no_show');
create type public.payment_status as enum ('unpaid','partial','paid','refunded');
create type public.stock_movement_type as enum ('purchase','consumption','loss','positive_adjustment','negative_adjustment','return');
create type public.message_status as enum ('scheduled','processing','sent','delivered','failed','cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  timezone text not null default 'America/Sao_Paulo', booking_hold_minutes integer not null default 30 check (booking_hold_minutes between 5 and 120),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, organization_id uuid not null references public.organizations(id),
  full_name text not null, role text not null default 'staff' check (role in ('owner','admin','staff')), created_at timestamptz not null default now(), unique (id, organization_id)
);
create table public.professionals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid references auth.users(id) on delete set null,
  name text not null, phone text, email text, specialties text[] not null default '{}', default_commission numeric(5,2) not null default 0,
  active boolean not null default true, notes text, created_at timestamptz not null default now(), unique (organization_id, email)
);
create table public.clients (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null,
  phone text not null, phone_normalized text not null, birth_date date, email text, instagram text, source text, referred_by uuid references public.clients(id),
  notes text, preferred_professional_id uuid references public.professionals(id), preferences jsonb not null default '{}', marketing_consent boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')), created_at timestamptz not null default now(), unique (organization_id, phone_normalized)
);
create table public.client_deposit_whitelist (
  client_id uuid primary key references public.clients(id), organization_id uuid not null references public.organizations(id), authorized_by uuid not null references auth.users(id),
  authorized_at timestamptz not null default now(), removed_by uuid references auth.users(id), removed_at timestamptz, reason text,
  check ((removed_by is null and removed_at is null) or (removed_by is not null and removed_at is not null))
);
create table public.services (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), category text not null, name text not null,
  description text, duration_minutes integer not null check (duration_minutes > 0), price numeric(12,2) not null check (price >= 0), maintenance_days integer,
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed')), commission_value numeric(12,2) not null default 0,
  active boolean not null default true, online_available boolean not null default true, buffer_minutes integer not null default 0,
  deposit_required boolean not null default true, deposit_type text check (deposit_type in ('percentage','fixed')), deposit_value numeric(12,2), unique (organization_id, name)
);
create table public.professional_services (
  professional_id uuid references public.professionals(id) on delete cascade, service_id uuid references public.services(id) on delete cascade,
  organization_id uuid not null references public.organizations(id), special_price numeric(12,2), commission_type text check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2), primary key (professional_id, service_id)
);
create table public.professional_availability (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), professional_id uuid not null references public.professionals(id) on delete cascade,
  kind text not null check (kind in ('weekly_shift','break','lunch','day_off','vacation','block','exception')), weekday smallint check (weekday between 0 and 6),
  starts_at timestamptz, ends_at timestamptz, start_time time, end_time time, notes text,
  check ((starts_at is null and ends_at is null) or starts_at < ends_at)
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), client_id uuid not null references public.clients(id),
  professional_id uuid not null references public.professionals(id), starts_at timestamptz not null, ends_at timestamptz not null, status public.appointment_status not null default 'pending',
  hold_expires_at timestamptz, source text not null default 'internal', notes text, discount numeric(12,2) not null default 0,
  discount_authorized_by uuid references auth.users(id), arrival_at timestamptz, actual_start_at timestamptz, actual_end_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), check (starts_at < ends_at)
);
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (organization_id with =, professional_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('pending','awaiting_deposit','scheduled','confirmed','arrived','in_progress'));
create index appointments_org_start_idx on public.appointments (organization_id, starts_at);

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id), professional_id uuid not null references public.professionals(id), description text not null,
  duration_minutes integer not null, unit_price numeric(12,2) not null, quantity numeric(10,2) not null default 1, discount numeric(12,2) not null default 0,
  surcharge numeric(12,2) not null default 0, commission_type text not null, commission_value numeric(12,2) not null, completed_at timestamptz
);
create table public.client_photos (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), client_id uuid not null references public.clients(id),
  appointment_id uuid references public.appointments(id), kind text not null check (kind in ('before','after','other')), storage_path text not null, created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), appointment_id uuid references public.appointments(id),
  client_id uuid not null references public.clients(id), kind text not null check (kind in ('deposit','payment','credit','refund','chargeback')),
  method text not null check (method in ('pix','cash','debit','credit','other')), amount numeric(12,2) not null check (amount > 0),
  status public.payment_status not null default 'paid', reverses_payment_id uuid references public.payments(id), paid_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), description text not null, category text not null,
  competence_date date not null, due_date date not null, paid_at date, amount numeric(12,2) not null check (amount > 0), status text not null check (status in ('pending','paid','overdue','cancelled')),
  payment_method text, recurrence_rule text, created_at timestamptz not null default now()
);
create table public.commissions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), appointment_item_id uuid not null references public.appointment_items(id),
  professional_id uuid not null references public.professionals(id), amount numeric(12,2) not null, status text not null default 'generated' check (status in ('generated','closed','paid')),
  closed_at timestamptz, paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, category text not null,
  base_unit text not null check (base_unit in ('unit','ml','l','g','kg','pair','box','package')), minimum_stock numeric(12,3) not null default 0,
  ideal_stock numeric(12,3) not null default 0, unit_cost numeric(12,4) not null default 0, supplier text, active boolean not null default true, unique (organization_id, name)
);
create table public.service_consumables (
  service_id uuid references public.services(id) on delete cascade, product_id uuid references public.products(id) on delete cascade,
  organization_id uuid not null references public.organizations(id), estimated_quantity numeric(12,3) not null check (estimated_quantity > 0), primary key (service_id, product_id)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), product_id uuid not null references public.products(id),
  movement_type public.stock_movement_type not null, quantity numeric(12,3) not null check (quantity > 0), appointment_item_id uuid references public.appointment_items(id),
  source text not null, unit_cost numeric(12,4), created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.message_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), kind text not null, name text not null,
  body text not null, active boolean not null default true, unique (organization_id, kind)
);
create table public.message_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), client_id uuid not null references public.clients(id),
  appointment_id uuid references public.appointments(id), template_id uuid references public.message_templates(id), channel text not null default 'whatsapp',
  provider text not null default 'simulator', scheduled_at timestamptz not null, status public.message_status not null default 'scheduled', payload jsonb not null default '{}',
  sent_at timestamptz, error text, created_at timestamptz not null default now()
);

-- Escopo organizacional do usuário autenticado; authorization não usa user_metadata.
-- A função vive fora do schema exposto para evitar recursão na policy de profiles.
create schema if not exists private;
create function private.current_organization_id() returns uuid language sql stable security definer
  set search_path = '' as $$ select organization_id from public.profiles where id = (select auth.uid()) $$;
revoke all on function private.current_organization_id() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_organization_id() to authenticated;

do $$ declare t text; begin
  foreach t in array array['organizations','profiles','professionals','clients','client_deposit_whitelist','services','professional_services','professional_availability','appointments','appointment_items','client_photos','payments','expenses','commissions','products','service_consumables','stock_movements','message_templates','message_jobs']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','professionals','clients','client_deposit_whitelist','services','professional_services','professional_availability','appointments','appointment_items','client_photos','payments','expenses','commissions','products','service_consumables','stock_movements','message_templates','message_jobs']
  loop
    execute format('create policy %I on public.%I for all to authenticated using (organization_id = (select private.current_organization_id())) with check (organization_id = (select private.current_organization_id()))', t || '_org_access', t);
  end loop;
end $$;
create policy organizations_member_select on public.organizations for select to authenticated using (id = (select private.current_organization_id()));

-- Clientes públicos não recebem acesso direto às tabelas; o agendamento online deve usar
-- endpoints server-side estritos para disponibilidade, hold e confirmação de pagamento.
