-- NEHOCPRO — à coller dans Supabase : SQL Editor → New query → Run

create table if not exists public.sites (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  author text not null default '',
  client_name text not null default '',
  client_phone text not null default '',
  client_email text not null default '',
  address text not null default '',
  site_type text not null default 'Maison',
  work_type text not null default 'Rénovation',
  general_notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id text primary key,
  site_id text not null references public.sites(id) on delete cascade,
  name text not null default '',
  notes text not null default '',
  position int not null default 0
);

create table if not exists public.openings (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  type text not null default 'Fenêtre',
  ref text not null default '',
  width text not null default '',
  height text not null default '',
  pose text not null default 'À définir',
  quantity text not null default '1',
  color_ral text not null default '',
  notes text not null default '',
  position int not null default 0
);

create table if not exists public.photos (
  id text primary key,
  site_id text not null references public.sites(id) on delete cascade,
  opening_id text references public.openings(id) on delete cascade,
  kind text not null check (kind in ('general', 'opening')),
  storage_path text not null,
  position int not null default 0
);

create index if not exists rooms_site_id_idx on public.rooms (site_id);
create index if not exists openings_room_id_idx on public.openings (room_id);
create index if not exists photos_site_id_idx on public.photos (site_id);

alter table public.sites enable row level security;
alter table public.rooms enable row level security;
alter table public.openings enable row level security;
alter table public.photos enable row level security;

drop policy if exists "team_sites" on public.sites;
create policy "team_sites" on public.sites for all to authenticated using (true) with check (true);

drop policy if exists "team_rooms" on public.rooms;
create policy "team_rooms" on public.rooms for all to authenticated using (true) with check (true);

drop policy if exists "team_openings" on public.openings;
create policy "team_openings" on public.openings for all to authenticated using (true) with check (true);

drop policy if exists "team_photos" on public.photos;
create policy "team_photos" on public.photos for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

drop policy if exists "team_photo_insert" on storage.objects;
create policy "team_photo_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'site-photos');

drop policy if exists "team_photo_select" on storage.objects;
create policy "team_photo_select" on storage.objects for select to authenticated
using (bucket_id = 'site-photos');

drop policy if exists "team_photo_update" on storage.objects;
create policy "team_photo_update" on storage.objects for update to authenticated
using (bucket_id = 'site-photos');

drop policy if exists "team_photo_delete" on storage.objects;
create policy "team_photo_delete" on storage.objects for delete to authenticated
using (bucket_id = 'site-photos');
