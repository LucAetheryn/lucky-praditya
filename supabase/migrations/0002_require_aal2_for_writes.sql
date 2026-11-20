-- APPLIED TO PRODUCTION — 2026-11-20.
-- Restrictive policies add AAL2 as an additional condition to existing admin policies.
begin;
do $$
declare t text;
begin
  foreach t in array array['profile','connections','highlights','now','site_settings'] loop
    execute format('drop policy if exists %I on public.%I', 'Writes require AAL2 (insert)', t);
    execute format('drop policy if exists %I on public.%I', 'Writes require AAL2 (update)', t);
    execute format('drop policy if exists %I on public.%I', 'Writes require AAL2 (delete)', t);
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check ((select auth.jwt()->>''aal'')=''aal2'')', 'Writes require AAL2 (insert)', t);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using ((select auth.jwt()->>''aal'')=''aal2'') with check ((select auth.jwt()->>''aal'')=''aal2'')', 'Writes require AAL2 (update)', t);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using ((select auth.jwt()->>''aal'')=''aal2'')', 'Writes require AAL2 (delete)', t);
  end loop;
end $$;

drop policy if exists "Media writes require AAL2 (insert)" on storage.objects;
drop policy if exists "Media writes require AAL2 (update)" on storage.objects;
drop policy if exists "Media writes require AAL2 (delete)" on storage.objects;
create policy "Media writes require AAL2 (insert)" on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'site-media' or (select auth.jwt()->>'aal')='aal2');
create policy "Media writes require AAL2 (update)" on storage.objects as restrictive
  for update to authenticated
  using (bucket_id <> 'site-media' or (select auth.jwt()->>'aal')='aal2')
  with check (bucket_id <> 'site-media' or (select auth.jwt()->>'aal')='aal2');
create policy "Media writes require AAL2 (delete)" on storage.objects as restrictive
  for delete to authenticated
  using (bucket_id <> 'site-media' or (select auth.jwt()->>'aal')='aal2');
commit;
