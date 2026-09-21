drop policy if exists "app_client_photos_insert" on storage.objects;

create policy "app_client_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos' 
    and auth.uid() is not null
  );
