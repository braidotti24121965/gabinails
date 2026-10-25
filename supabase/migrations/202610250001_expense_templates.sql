-- Catálogo de despesas fixas por organização.
create table if not exists public.expense_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  category text not null default 'Geral',
  default_amount numeric(12,2) check (default_amount is null or default_amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists expense_templates_org_active_idx on public.expense_templates (organization_id, active, name);
alter table public.expense_templates enable row level security;
grant select, insert, update, delete on public.expense_templates to authenticated;
create policy expense_templates_org_access on public.expense_templates
  for all to authenticated
  using (organization_id = (select private.current_organization_id()))
  with check (organization_id = (select private.current_organization_id()));

alter table public.expenses add column if not exists expense_template_id uuid references public.expense_templates(id) on delete set null;
create index if not exists expenses_template_idx on public.expenses (expense_template_id);
