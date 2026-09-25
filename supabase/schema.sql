create table if not exists public.snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

alter table public.snapshots enable row level security;

create policy "own snapshot"
  on public.snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
