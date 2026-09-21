-- Create private bucket for client photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-photos',
  'client-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
) on conflict (id) do update set 
  public = false, 
  file_size_limit = 5242880, 
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Removendo apenas as políticas deste projeto
drop policy if exists "app_client_photos_insert" on storage.objects;
drop policy if exists "app_client_photos_select" on storage.objects;
drop policy if exists "app_client_photos_delete" on storage.objects;

-- 1. Insert Policy
create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' and
    (storage.foldername(name))[1] = (select private.current_organization_id())::text and
    exists (
      select 1 from public.clients c 
      where c.id = (
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[2])::uuid
          else null
        end
      )
      and c.organization_id = (select private.current_organization_id())
    )
  );

-- 2. Select Policy
create policy "app_client_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-photos' and
    (storage.foldername(name))[1] = (select private.current_organization_id())::text and
    exists (
      select 1 from public.clients c 
      where c.id = (
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[2])::uuid
          else null
        end
      )
      and c.organization_id = (select private.current_organization_id())
    )
  );

-- 3. Delete Policy
create policy "app_client_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'client-photos' and
    (storage.foldername(name))[1] = (select private.current_organization_id())::text and
    exists (
      select 1 from public.clients c 
      where c.id = (
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then ((storage.foldername(name))[2])::uuid
          else null
        end
      )
      and c.organization_id = (select private.current_organization_id())
    )
  );
