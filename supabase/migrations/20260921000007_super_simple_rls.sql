-- Drop old insert policy
drop policy if exists "app_client_photos_insert" on storage.objects;

-- Insert Policy that matches the Select policy exactly
create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' 
    and split_part(name, '/', 1) = (select organization_id::text from public.profiles where id = auth.uid())
  );
