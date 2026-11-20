-- Read-only checks. Run each block in the SQL Editor; everything is rolled back.
-- After migration 0001, anon must see ONLY the public projection row.
begin;
set local role anon;
  select public.get_public_site_config() is not null as public_rpc_works; -- true
  select count(*) as canonical_rows_visible from public.site_settings where key = 'site_config'; -- 0
  select count(*) as public_rows_visible from public.site_settings where key = 'site_config_public'; -- 1
  select * from public.admin_users; -- ERROR: permission denied
rollback;

-- Anonymous callers must not execute the write RPC.
begin;
set local role anon;
  select public.save_site_config('{}'::jsonb, null::timestamptz); -- ERROR: permission denied for function
rollback;

-- Authenticated but non-admin callers must fail before the RPC writes anything.
begin;
set local role authenticated;
  select public.is_admin(); -- false when no authenticated admin JWT claims are supplied
  select public.save_site_config('{}'::jsonb, null::timestamptz); -- ERROR: Admin access required
rollback;
