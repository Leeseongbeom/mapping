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

-- 일자별 방문수 카운터
create table if not exists public.visits (
  visit_date date primary key,
  count integer not null default 0
);

alter table public.visits enable row level security;

drop policy if exists "server service role only" on public.visits;
create policy "server service role only"
on public.visits
for all
using (false)
with check (false);

-- 원자적 증가 RPC. 서버에서 /rest/v1/rpc/increment_visit 호출
create or replace function public.increment_visit(target_date date)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.visits (visit_date, count) values (target_date, 1)
  on conflict (visit_date) do update set count = public.visits.count + 1
  returning public.visits.count into new_count;
  return new_count;
end;
$$;
