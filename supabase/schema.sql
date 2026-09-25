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
