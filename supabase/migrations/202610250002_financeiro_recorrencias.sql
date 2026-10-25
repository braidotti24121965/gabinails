-- Expansão aditiva: nenhum lançamento existente é modificado.
alter table public.expense_templates
 add column if not exists recurring_monthly boolean not null default false,
 add column if not exists recurring_day smallint,
 add constraint recurring_day_range check (recurring_day is null or recurring_day between 1 and 31);
alter table public.expenses
 add column if not exists recurring_template_id uuid references public.expense_templates(id) on delete set null;
create unique index if not exists expenses_recurring_unique_month
 on public.expenses(organization_id,recurring_template_id,due_date);
create index if not exists expenses_pending_due_idx on public.expenses(organization_id,due_date) where status='pending';
create index if not exists expenses_category_idx on public.expenses(organization_id,category);
