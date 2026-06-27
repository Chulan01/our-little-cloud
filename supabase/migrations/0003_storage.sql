insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-media',
  'couple-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_object_couple_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid
$$;

-- Policy "couple_media_select_own_prefix": Users can read storage objects only when the first path segment equals their couple_id.
create policy "couple_media_select_own_prefix" on storage.objects
for select
using (
  bucket_id = 'couple-media'
  and public.storage_object_couple_id(name) = public.auth_couple_id()
);

-- Policy "couple_media_insert_own_prefix": Users can upload only into their own couple_id folder.
create policy "couple_media_insert_own_prefix" on storage.objects
for insert
with check (
  bucket_id = 'couple-media'
  and public.storage_object_couple_id(name) = public.auth_couple_id()
);

-- Policy "couple_media_update_own_prefix": Users can update only media objects under their own couple_id folder.
create policy "couple_media_update_own_prefix" on storage.objects
for update
using (
  bucket_id = 'couple-media'
  and public.storage_object_couple_id(name) = public.auth_couple_id()
)
with check (
  bucket_id = 'couple-media'
  and public.storage_object_couple_id(name) = public.auth_couple_id()
);

-- Policy "couple_media_delete_own_prefix": Users can delete only media objects under their own couple_id folder.
create policy "couple_media_delete_own_prefix" on storage.objects
for delete
using (
  bucket_id = 'couple-media'
  and public.storage_object_couple_id(name) = public.auth_couple_id()
);
