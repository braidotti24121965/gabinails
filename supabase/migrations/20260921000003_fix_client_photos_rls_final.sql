drop policy if exists "app_client_photos_insert" on storage.objects;

create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' and
    split_part(name, '/', 1) = (select organization_id::text from public.profiles where id = auth.uid()) and
    (
      name like '%/' 
      or
      exists (
        select 1 from public.clients c 
        where c.id = (
          case
            when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            then (split_part(name, '/', 2))::uuid
            else null
          end
        )
        and c.organization_id = (select organization_id from public.profiles where id = auth.uid())
      )
    )
  );
