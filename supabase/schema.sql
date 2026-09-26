create table if not exists public.snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

alter table public.snapshots enable row level security;

drop policy if exists "own snapshot" on public.snapshots;

create policy "own snapshot"
  on public.snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.snapshots from anon;
grant select, insert, update, delete on table public.snapshots to authenticated;
grant all on table public.snapshots to service_role;

alter table public.snapshots replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.snapshots;
exception
  when duplicate_object then null;
end $$;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.account_recovery (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null
);

alter table public.account_recovery enable row level security;
revoke all on table public.account_recovery from anon, authenticated;

create or replace function public.set_recovery_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'وارد نشده‌اید';
  end if;
  if p_code is null or char_length(p_code) < 8 then
    raise exception 'کد بازیابی کوتاه است';
  end if;
  insert into public.account_recovery (user_id, code_hash)
  values (auth.uid(), encode(digest(convert_to(p_code, 'UTF8'), 'sha256'), 'hex'))
  on conflict (user_id) do update set code_hash = excluded.code_hash;
end;
$$;

create or replace function public.recover_with_code(p_email text, p_code text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  uid uuid;
  expected text;
  actual text;
begin
  if p_password is null or char_length(p_password) < 6 then
    raise exception 'رمز حداقل ۶ حرف است';
  end if;
  if p_code is null or char_length(trim(p_code)) < 8 then
    raise exception 'کد بازیابی نادرست است';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'کد بازیابی نادرست است';
  end if;
  select code_hash into expected from public.account_recovery where user_id = uid;
  actual := encode(digest(convert_to(trim(p_code), 'UTF8'), 'sha256'), 'hex');
  if expected is null or expected <> actual then
    raise exception 'کد بازیابی نادرست است';
  end if;
  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf', 10)),
         updated_at = now()
   where id = uid;
end;
$$;

revoke all on function public.set_recovery_code(text) from public, anon;
revoke all on function public.recover_with_code(text, text, text) from public;
grant execute on function public.set_recovery_code(text) to authenticated;
grant execute on function public.recover_with_code(text, text, text) to anon, authenticated;
