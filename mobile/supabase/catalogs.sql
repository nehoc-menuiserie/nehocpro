-- Listes éditables du back-office. SQL Editor → coller → Run

create table if not exists public.catalogs (
  id text primary key,
  kind text not null,
  label text not null,
  extra jsonb not null default '{}'::jsonb,
  position int not null default 0
);

create index if not exists catalogs_kind_idx on public.catalogs (kind, position);

alter table public.catalogs enable row level security;

drop policy if exists "team_catalogs" on public.catalogs;
create policy "team_catalogs" on public.catalogs for all to authenticated using (true) with check (true);
