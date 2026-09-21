-- Drop old policies
drop policy if exists "app_client_photos_insert" on storage.objects;
drop policy if exists "app_client_photos_select" on storage.objects;
drop policy if exists "app_client_photos_delete" on storage.objects;

-- Insert Policy
create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' 
    and split_part(name, '/', 1) = (select organization_id::text from public.profiles where id = auth.uid())
    and (
      name like '%/'
      or
      exists (
        select 1 from public.clients c
        where c.id::text = split_part(name, '/', 2)
        and c.organization_id = (select organization_id from public.profiles where id = auth.uid())
      )
    )
  );

-- Select Policy
create policy "app_client_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-photos' and
    split_part(name, '/', 1) = (select organization_id::text from public.profiles where id = auth.uid())
  );

-- Delete Policy
create policy "app_client_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'client-photos' and
    split_part(name, '/', 1) = (select organization_id::text from public.profiles where id = auth.uid())
  );
