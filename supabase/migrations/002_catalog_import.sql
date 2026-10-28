-- Run after schema.sql. Imported metadata remains unpublished until reviewed.
alter table public.series add column if not exists source_url text;
create unique index if not exists series_source_url_unique on public.series(source_url);
create or replace function public.import_catalog(items jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; inserted integer := 0; affected integer;
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) not between 1 and 50 then
   raise exception 'Expected 1–50 records';
 end if;
 for item in select value from jsonb_array_elements(items) loop
   if coalesce(item->>'source_url','') !~ '^https://www\.reelshort\.com/movie/[A-Za-z0-9_%~-]+$'
      or length(trim(coalesce(item->>'title',''))) not between 1 and 200
      or length(coalesce(item->>'description','')) > 5000 then
     raise exception 'Invalid metadata record';
   end if;
   insert into public.series(title,description,genre,poster_url,source_url,published,featured)
   values(trim(item->>'title'),coalesce(item->>'description',''),coalesce(nullif(item->>'genre',''),'Драм'),
          'https://reelshort.mn/icon.svg',item->>'source_url',false,false)
   on conflict (source_url) do nothing;
   get diagnostics affected = row_count;
   inserted := inserted + affected;
 end loop;
 return inserted;
end $$;
revoke all on function public.import_catalog(jsonb) from public, anon;
grant execute on function public.import_catalog(jsonb) to authenticated;
