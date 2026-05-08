insert into storage.buckets (id, name, public) values ('dish-images', 'dish-images', true) on conflict (id) do nothing;

create policy "Dish images are publicly readable"
on storage.objects for select
using (bucket_id = 'dish-images');

create policy "Admins upload dish images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'dish-images' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins update dish images"
on storage.objects for update
to authenticated
using (bucket_id = 'dish-images' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins delete dish images"
on storage.objects for delete
to authenticated
using (bucket_id = 'dish-images' and public.has_role(auth.uid(), 'admin'::public.app_role));