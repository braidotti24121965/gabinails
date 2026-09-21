-- Drop old policy
drop policy if exists "app_client_photos_insert" on storage.objects;

-- Recreate Insert Policy allowing folder placeholders (name ending with '/')
create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' and
    (storage.foldername(name))[1] = (select private.current_organization_id())::text and
    (
      -- Supabase Storage automatically creates folder placeholders ending in '/'
      name like '%/' 
      or
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
    )
  );
