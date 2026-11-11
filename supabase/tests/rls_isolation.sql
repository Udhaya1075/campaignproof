-- RLS isolation check. Paste into the Supabase SQL editor. It rolls back, leaving no data.
-- Expected result: every NOTICE says PASS. Any exception means isolation is broken.
begin;

insert into auth.users (id, email, instance_id, aud, role)
values ('00000000-0000-0000-0000-0000000000a1','a@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
       ('00000000-0000-0000-0000-0000000000b2','b@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

insert into public.campaigns (id, user_id, name) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','Campaign of A');

insert into public.buffer_tokens (user_id, access_token_enc, expires_at)
values ('00000000-0000-0000-0000-0000000000a1','enc', now() + interval '1 hour');

-- Act as user B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.campaigns;
  if n <> 0 then raise exception 'FAIL: B can read A campaigns (%)', n; end if;
  raise notice 'PASS: B cannot read A campaigns';

  select count(*) into n from public.buffer_tokens;
  if n <> 0 then raise exception 'FAIL: tokens visible to authenticated user'; end if;
  raise notice 'PASS: tokens not readable by authenticated role';

  begin
    insert into public.campaigns (user_id, name) values ('00000000-0000-0000-0000-0000000000a1','Injected');
    raise exception 'FAIL: B inserted a row owned by A';
  exception when insufficient_privilege or check_violation then
    raise notice 'PASS: B cannot insert rows owned by A';
  end;

  begin
    insert into public.campaign_phrases (user_id, campaign_id, kind, phrase)
    values ('00000000-0000-0000-0000-0000000000b2','11111111-1111-1111-1111-111111111111','required','x');
    raise exception 'FAIL: B attached a phrase to A campaign';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS: B cannot attach child rows to A campaign';
  end;
end $$;

rollback;
