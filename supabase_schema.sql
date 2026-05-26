create table if not exists public.used_coordinates (
  coord text primary key,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint used_coordinates_coord_format check (
    coord ~ '^[0-9]{1,3},[0-9]{1,3}$'
  )
);

alter table public.used_coordinates enable row level security;

drop policy if exists "server service role only" on public.used_coordinates;
create policy "server service role only"
on public.used_coordinates
for all
using (false)
with check (false);
