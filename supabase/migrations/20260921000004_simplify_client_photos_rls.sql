drop policy if exists "app_client_photos_insert" on storage.objects;

create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' 
    and split_part(name, '/', 1) = (select private.current_organization_id())::text
    and (
      name like '%/'
      or
      exists (
        select 1 from public.clients c
        where c.id::text = split_part(name, '/', 2)
        and c.organization_id = (select private.current_organization_id())
      )
    )
  );
