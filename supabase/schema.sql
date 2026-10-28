-- Apply once in the Supabase SQL editor. No service-role key belongs in the browser.
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table public.series (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 200),
 description text not null default '', genre text not null, poster_url text not null check(poster_url ~ '^https://'),
 featured boolean not null default false, published boolean not null default false, created_at timestamptz not null default now()
);
create table public.episodes (
 id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series(id) on delete cascade,
 number integer not null check(number>0), title text not null, video_url text not null check(video_url ~ '^https://'),
 published boolean not null default false, unique(series_id,number)
);
create table public.watchlist(user_id uuid references auth.users(id) on delete cascade, series_id uuid references public.series(id) on delete cascade, primary key(user_id,series_id));
create table public.progress(user_id uuid references auth.users(id) on delete cascade, episode_id uuid references public.episodes(id) on delete cascade, seconds integer not null default 0 check(seconds>=0), primary key(user_id,episode_id));
alter table public.series enable row level security;
alter table public.episodes enable row level security;
alter table public.watchlist enable row level security;
alter table public.progress enable row level security;
create policy "published series" on public.series for select using(published or public.is_admin());
create policy "admin series" on public.series for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "published episodes" on public.episodes for select using((published and exists(select 1 from public.series s where s.id=series_id and s.published)) or public.is_admin());
create policy "admin episodes" on public.episodes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "own watchlist" on public.watchlist for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own progress" on public.progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.series,public.episodes to anon;
grant select,insert,update,delete on public.series,public.episodes,public.watchlist,public.progress to authenticated;
-- Promote an existing user only from SQL editor, never from user metadata:
-- insert into public.admins(user_id) values ('YOUR_AUTH_USER_UUID');
