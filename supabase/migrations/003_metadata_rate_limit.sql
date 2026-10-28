-- Serverless metadata endpoint throttle. One request per 10 seconds globally.
create table if not exists public.metadata_throttle (
 id boolean primary key default true check(id), requested_at timestamptz not null
);
alter table public.metadata_throttle enable row level security;
revoke all on public.metadata_throttle from anon, authenticated;
create or replace function public.claim_metadata_request() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 insert into public.metadata_throttle(id,requested_at) values(true,clock_timestamp())
 on conflict(id) do update set requested_at=excluded.requested_at
 where public.metadata_throttle.requested_at < clock_timestamp()-interval '10 seconds'
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.claim_metadata_request() from public,anon;
grant execute on function public.claim_metadata_request() to authenticated;
