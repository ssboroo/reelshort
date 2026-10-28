create table if not exists public.subtitle_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 usage_day date not null, requests integer not null, last_request timestamptz not null
);
alter table public.subtitle_usage enable row level security;
revoke all on public.subtitle_usage from anon,authenticated;
create or replace function public.claim_subtitle_request() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.subtitle_usage(user_id,usage_day,requests,last_request)
 values(auth.uid(),(clock_timestamp() at time zone 'UTC')::date,1,clock_timestamp())
 on conflict(user_id) do update set
 usage_day=excluded.usage_day,
 requests=case when public.subtitle_usage.usage_day=excluded.usage_day then public.subtitle_usage.requests+1 else 1 end,
 last_request=excluded.last_request
 where public.subtitle_usage.last_request<clock_timestamp()-interval '3 seconds'
 and (public.subtitle_usage.usage_day<>excluded.usage_day or public.subtitle_usage.requests<300)
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.claim_subtitle_request() from public,anon;
grant execute on function public.claim_subtitle_request() to authenticated;
