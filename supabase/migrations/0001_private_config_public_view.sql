-- APPLIED TO PRODUCTION — 2026-11-20.
-- Keeps site_settings.site_config as the canonical full configuration (private),
-- publishes an explicit allowlisted projection in site_config_public, and makes
-- optimistic concurrency atomic inside the save RPC.
begin;

-- Return only explicitly approved object keys. Unknown/future keys are private by default.
create or replace function public.lp_pick(p jsonb, p_keys text[])
returns jsonb
language sql immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) e
  where e.key = any(p_keys);
$$;
revoke all on function public.lp_pick(jsonb, text[]) from public, anon;
grant execute on function public.lp_pick(jsonb, text[]) to authenticated;

create or replace function public.lp_valid_fields(p_obj jsonb, p_spec jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select jsonb_typeof(p_obj) = 'object'
     and not exists (
       select 1 from jsonb_each(coalesce(p_spec, '{}'::jsonb)) s
       where p_obj ? s.key
         and jsonb_typeof(p_obj->s.key) is distinct from (s.value #>> '{}')
     );
$$;
revoke all on function public.lp_valid_fields(jsonb, jsonb) from public, anon;
grant execute on function public.lp_valid_fields(jsonb, jsonb) to authenticated;

create or replace function public.build_public_site_config(p jsonb)
returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'name', p->'name',
    'role', p->'role',
    'tagline', p->'tagline',
    'about', p->'about',
    'footer', p->'footer',
    'contact', p->'contact',
    'maint', p->'maint',
    'avail', public.lp_pick(p->'avail', array['show','text']),
    'seo', public.lp_pick(p->'seo', array['title','desc']),
    'anim', public.lp_pick(p->'anim', array['on','intro','reveal','speed']),
    'look', public.lp_pick(p->'look', array['glass']),
    'sections', coalesce((
      select jsonb_agg(public.lp_pick(s, array['id','t','show','nav']) order by ord)
      from jsonb_array_elements(coalesce(p->'sections','[]'::jsonb)) with ordinality x(s,ord)
      where s->'show' = 'true'::jsonb
    ), '[]'::jsonb),
    'stack', jsonb_build_object(
      'marquee', p#>'{stack,marquee}',
      'cats', coalesce((
        select jsonb_agg(public.lp_pick(cat, array['k','v']) order by ord)
        from jsonb_array_elements(coalesce(p#>'{stack,cats}','[]'::jsonb)) with ordinality x(cat,ord)
      ), '[]'::jsonb)
    ),
    'connections', coalesce((
      select jsonb_agg(public.lp_pick(c, array['id','p','name','user','url','color','icon','glow','show','pub','hl']) order by ord)
      from jsonb_array_elements(coalesce(p->'connections','[]'::jsonb)) with ordinality x(c,ord)
      where c->'show' = 'true'::jsonb and c->'pub' = 'true'::jsonb
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(public.lp_pick(h, array['plat','type','url','pin','thumb','sync','t','d','cat','date','show']) order by ord)
      from jsonb_array_elements(coalesce(p->'highlights','[]'::jsonb)) with ordinality x(h,ord)
      where h->'show' = 'true'::jsonb
        and (coalesce(h->>'plat','') = '' or exists (
          select 1 from jsonb_array_elements(coalesce(p->'connections','[]'::jsonb)) as e(c)
          where c->>'id' = h->>'plat'
            and c->'show' = 'true'::jsonb and c->'pub' = 'true'::jsonb
        ))
    ), '[]'::jsonb),
    'now', coalesce((
      select jsonb_agg(public.lp_pick(n, array['k','v','show']) order by ord)
      from jsonb_array_elements(coalesce(p->'now','[]'::jsonb)) with ordinality x(n,ord)
      where n->'show' = 'true'::jsonb
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.build_public_site_config(jsonb) from public, anon;
grant execute on function public.build_public_site_config(jsonb) to authenticated;

-- Replace the old one-argument RPC so callers cannot bypass the atomic version check.
drop function if exists public.save_site_config(jsonb);
create function public.save_site_config(
  p_config jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current timestamptz;
  v_next timestamptz;
  v_item jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if (select auth.jwt()->>'aal') is distinct from 'aal2' then
    raise exception 'MFA AAL2 verification required' using errcode = '42501';
  end if;
  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Invalid configuration: expected a JSON object';
  end if;
  if octet_length(p_config::text) > 1048576 then
    raise exception 'Configuration exceeds the 1 MiB limit';
  end if;

  -- Validate required containers before expanding any JSON arrays.
  if jsonb_typeof(p_config->'connections') is distinct from 'array'
     or jsonb_typeof(p_config->'highlights') is distinct from 'array'
     or jsonb_typeof(p_config->'now') is distinct from 'array'
     or jsonb_typeof(p_config->'sections') is distinct from 'array'
     or jsonb_typeof(p_config#>'{stack,cats}') is distinct from 'array'
     or jsonb_typeof(p_config->'stack') is distinct from 'object'
     or jsonb_typeof(p_config->'seo') is distinct from 'object'
     or jsonb_typeof(p_config->'anim') is distinct from 'object'
     or jsonb_typeof(p_config->'look') is distinct from 'object'
     or jsonb_typeof(p_config->'avail') is distinct from 'object' then
    raise exception 'Invalid configuration structure';
  end if;

  if jsonb_array_length(p_config->'connections') > 50
     or jsonb_array_length(p_config->'highlights') > 200
     or jsonb_array_length(p_config->'now') > 50
     or jsonb_array_length(p_config->'sections') > 20
     or jsonb_array_length(p_config#>'{stack,cats}') > 30 then
    raise exception 'Configuration contains too many items';
  end if;

  if exists (select 1 from jsonb_array_elements(p_config->'connections') as e(value) where jsonb_typeof(e.value) <> 'object')
     or exists (select 1 from jsonb_array_elements(p_config->'highlights') as e(value) where jsonb_typeof(e.value) <> 'object')
     or exists (select 1 from jsonb_array_elements(p_config->'now') as e(value) where jsonb_typeof(e.value) <> 'object')
     or exists (select 1 from jsonb_array_elements(p_config->'sections') as e(value) where jsonb_typeof(e.value) <> 'object')
     or exists (select 1 from jsonb_array_elements(p_config#>'{stack,cats}') as e(value) where jsonb_typeof(e.value) <> 'object') then
    raise exception 'Every configuration list item must be an object';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_config->'connections') as e(x)
    where (x ? 'show' and jsonb_typeof(x->'show') is distinct from 'boolean')
       or (x ? 'pub' and jsonb_typeof(x->'pub') is distinct from 'boolean')
       or (x ? 'id' and (jsonb_typeof(x->'id') is distinct from 'string' or length(x->>'id') > 40))
       or (x ? 'url' and (jsonb_typeof(x->'url') is distinct from 'string' or length(x->>'url') > 2048))
  ) or exists (
    select 1 from jsonb_array_elements(p_config->'highlights') as e(x)
    where (x ? 'show' and jsonb_typeof(x->'show') is distinct from 'boolean')
       or (x ? 'url' and (jsonb_typeof(x->'url') is distinct from 'string' or length(x->>'url') > 2048))
       or (x ? 't' and (jsonb_typeof(x->'t') is distinct from 'string' or length(x->>'t') > 200))
  ) or exists (
    select 1 from jsonb_array_elements(p_config->'now') as e(x)
    where (x ? 'show' and jsonb_typeof(x->'show') is distinct from 'boolean')
  ) or exists (
    select 1 from jsonb_array_elements(p_config->'sections') as e(x)
    where (x ? 'show' and jsonb_typeof(x->'show') is distinct from 'boolean')
       or (x ? 'nav' and jsonb_typeof(x->'nav') is distinct from 'boolean')
  ) then
    raise exception 'Invalid field type or field length in configuration';
  end if;

  -- Reject wrong JSON types in public-facing fields; do not serialize attacker-controlled objects as text.
  if not public.lp_valid_fields(p_config,
       '{"name":"string","role":"string","tagline":"string","about":"string","footer":"string","contact":"string","maint":"boolean"}'::jsonb)
     or not public.lp_valid_fields(p_config->'avail', '{"show":"boolean","text":"string"}'::jsonb)
     or not public.lp_valid_fields(p_config->'seo', '{"title":"string","desc":"string"}'::jsonb)
     or not public.lp_valid_fields(p_config->'anim', '{"on":"boolean","intro":"boolean","reveal":"boolean","speed":"number"}'::jsonb)
     or not public.lp_valid_fields(p_config->'look', '{"glass":"number"}'::jsonb)
     or not public.lp_valid_fields(p_config->'stack', '{"marquee":"boolean"}'::jsonb)
     or exists (select 1 from jsonb_array_elements(p_config->'connections') as e(x)
       where not public.lp_valid_fields(x, '{"id":"string","p":"string","name":"string","user":"string","url":"string","color":"string","icon":"string","glow":"number","show":"boolean","pub":"boolean","hl":"boolean"}'::jsonb))
     or exists (select 1 from jsonb_array_elements(p_config->'highlights') as e(x)
       where not public.lp_valid_fields(x, '{"plat":"string","type":"string","url":"string","pin":"boolean","thumb":"string","sync":"boolean","t":"string","d":"string","cat":"string","date":"string","show":"boolean"}'::jsonb))
     or exists (select 1 from jsonb_array_elements(p_config->'now') as e(x)
       where not public.lp_valid_fields(x, '{"k":"string","v":"string","show":"boolean"}'::jsonb))
     or exists (select 1 from jsonb_array_elements(p_config->'sections') as e(x)
       where not public.lp_valid_fields(x, '{"id":"string","t":"string","show":"boolean","nav":"boolean"}'::jsonb))
     or exists (select 1 from jsonb_array_elements(p_config#>'{stack,cats}') as e(x)
       where not public.lp_valid_fields(x, '{"k":"string","v":"string"}'::jsonb)) then
    raise exception 'Invalid field type in configuration';
  end if;


  -- LP_STRICT_VALIDATION_V1
  -- Match database validation with frontend cleanCfg() and Storage externalization.

  if exists (
    select 1 from (values
      ('name',300),('role',300),('tagline',300),
      ('footer',300),('about',5000),('contact',1000)
    ) as lim(k,n)
    where p_config ? lim.k
      and length(p_config->>lim.k) > lim.n
  ) or length(coalesce(p_config#>>'{seo,title}','')) > 200
    or length(coalesce(p_config#>>'{seo,desc}','')) > 500
    or length(coalesce(p_config#>>'{avail,text}','')) > 300
  then
    raise exception 'Configuration text exceeds allowed length';
  end if;

  if coalesce((p_config#>>'{look,glass}')::numeric, 22) not between 6 and 40
     or coalesce((p_config#>>'{anim,speed}')::numeric, 1) not between 0.5 and 2
     or exists (
       select 1 from jsonb_array_elements(p_config->'connections') as e(x)
       where coalesce((x->>'glow')::numeric, 40) not between 0 and 100
     )
  then
    raise exception 'Configuration numeric value is outside allowed range';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_config->'connections') as e(x)
    where length(coalesce(x->>'name','')) > 80
       or length(coalesce(x->>'user','')) > 120
       or length(coalesce(x->>'url','')) > 2048
       or length(coalesce(x->>'color','')) > 7
       or length(coalesce(x->>'icon','')) > 2048
       or (
         coalesce(x->>'url','') <> ''
         and not (
           (x->>'url') ~* '^(https?://|mailto:|tel:)'
           or (
             x->>'p' = 'email'
             and (x->>'url') ~ '^[^[:space:]@<>"'']+@[^[:space:]@<>"'']+$'
           )
         )
       )
       or (
         coalesce(x->>'icon','') <> ''
         and (x->>'icon') !~* '^https://'
       )
       or (
         coalesce(x->>'color','') <> ''
         and (x->>'color') !~ '^#[0-9A-Fa-f]{6}$'
       )
  ) then
    raise exception 'Invalid connection text, URL, image or color';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_config->'highlights') as e(x)
    where length(coalesce(x->>'url','')) > 2048
       or length(coalesce(x->>'thumb','')) > 2048
       or length(coalesce(x->>'t','')) > 200
       or length(coalesce(x->>'d','')) > 2000
       or length(coalesce(x->>'cat','')) > 100
       or length(coalesce(x->>'date','')) > 10
       or (
         coalesce(x->>'url','') <> ''
         and (x->>'url') !~* '^(https?://|mailto:|tel:)'
       )
       or (
         coalesce(x->>'thumb','') <> ''
         and (x->>'thumb') !~* '^https://'
       )
  ) then
    raise exception 'Invalid highlight text, URL or image';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_config->'now') as e(x)
    where length(coalesce(x->>'k','')) > 100
       or length(coalesce(x->>'v','')) > 500
  ) or exists (
    select 1 from jsonb_array_elements(p_config->'sections') as e(x)
    where length(coalesce(x->>'t','')) > 60
  ) or exists (
    select 1 from jsonb_array_elements(p_config#>'{stack,cats}') as e(x)
    where length(coalesce(x->>'k','')) > 100
       or length(coalesce(x->>'v','')) > 1500
  ) then
    raise exception 'Configuration list item exceeds allowed length';
  end if;

  -- Serialize concurrent saves and compare the version while holding the row lock.
  select updated_at into v_current
  from public.site_settings
  where key = 'site_config'
  for update;
  if not found then
    raise exception 'Canonical site_config row is missing';
  end if;
  if p_expected_updated_at is null or p_expected_updated_at is distinct from v_current then
    raise exception 'The server configuration changed. Reload before saving.' using errcode = '40001';
  end if;

  update public.site_settings
    set value = p_config, is_public = false, updated_at = clock_timestamp()
    where key = 'site_config'
    returning updated_at into v_next;

  insert into public.site_settings (key, value, is_public)
    values ('site_config_public', public.build_public_site_config(p_config), true)
    on conflict (key) do update
      set value = excluded.value, is_public = true, updated_at = clock_timestamp();

  return jsonb_build_object('success', true, 'updated_at', v_next);
end;
$$;
revoke all on function public.save_site_config(jsonb, timestamptz) from public, anon;
grant execute on function public.save_site_config(jsonb, timestamptz) to authenticated;

create or replace function public.get_public_site_config()
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
  select value from public.site_settings
  where key = 'site_config_public' and is_public = true
  limit 1;
$$;
revoke all on function public.get_public_site_config() from public;
grant execute on function public.get_public_site_config() to anon, authenticated;

-- Initial publication projection and privacy boundary. Canonical row content is not changed.
insert into public.site_settings (key, value, is_public)
select 'site_config_public', public.build_public_site_config(value), true
from public.site_settings where key = 'site_config'
on conflict (key) do update
  set value = excluded.value, is_public = true, updated_at = clock_timestamp();
update public.site_settings set is_public = false where key = 'site_config';

-- Defense in depth: even an accidental is_public=true on the canonical row must
-- never make the full configuration readable through the table REST endpoint.
drop policy if exists "Public can read public settings" on public.site_settings;
create policy "Public can read public settings" on public.site_settings
  for select to anon, authenticated
  using (key = 'site_config_public' and is_public = true);

commit;

-- IMPORTANT: This migration replaces save_site_config(jsonb) with the two-argument
-- signature. The matching frontend must send p_expected_updated_at. Do not run an
-- older frontend against this migration.
