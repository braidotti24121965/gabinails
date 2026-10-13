create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id, name)
);

alter table public.specialties enable row level security;

create policy "Specialties are viewable by users in the same organization"
  on public.specialties for select
  using (organization_id = (select private.current_organization_id()));

create policy "Specialties are insertable by users in the same organization"
  on public.specialties for insert
  with check (organization_id = (select private.current_organization_id()));

create policy "Specialties are updatable by users in the same organization"
  on public.specialties for update
  using (organization_id = (select private.current_organization_id()));

-- Do not seed a hard-coded organization here. Organizations are created during
-- onboarding, and their specialties must be created for the real tenant ID.
