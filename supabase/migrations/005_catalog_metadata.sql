-- Run after 004_live_subtitles.sql (and after schema.sql + migrations 002–004).
alter table public.series add column if not exists episode_count integer check (episode_count between 0 and 1000);
alter table public.series add column if not exists first_paid_episode integer check (first_paid_episode between 0 and 1000);

create or replace function public.import_catalog(items jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
 item jsonb;
 inserted integer := 0;
 affected integer;
 title_value text;
 source_value text;
 poster_value text;
 chapter_value integer;
 paid_value integer;
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) not between 1 and 1000 then
   raise exception 'Expected 1–1000 records';
 end if;
 for item in select value from jsonb_array_elements(items) loop
   title_value := trim(coalesce(item->>'title',''));
   source_value := item->>'source_url';
   poster_value := item->>'cover_url';
   if coalesce(source_value,'') !~ '^https://www\.reelshort\.com/movie/[A-Za-z0-9_%~-]+$'
      or length(title_value) not between 1 and 200
      or length(coalesce(item->>'description','')) > 5000
      or length(coalesce(item->>'genre','')) > 80
      or (poster_value is not null and (poster_value !~ '^https://[^[:space:]]+$' or length(poster_value)>2000))
      or (coalesce(item->>'chapter_count','') <> '' and item->>'chapter_count' !~ '^[0-9]{1,4}$')
      or (coalesce(item->>'first_paid_episode','') <> '' and item->>'first_paid_episode' !~ '^[0-9]{1,4}$') then
     raise exception 'Invalid metadata record';
   end if;
   chapter_value := nullif(item->>'chapter_count','')::integer;
   paid_value := nullif(item->>'first_paid_episode','')::integer;
   if chapter_value is not null and chapter_value not between 0 and 1000 then raise exception 'Invalid episode count'; end if;
   if paid_value is not null and paid_value not between 0 and 1000 then raise exception 'Invalid paid episode number'; end if;
   insert into public.series(title,description,genre,poster_url,source_url,published,featured,episode_count,first_paid_episode)
   values(title_value,coalesce(item->>'description',''),coalesce(nullif(item->>'genre',''),'Драм'),
          coalesce(nullif(poster_value,''),'https://reelshort.mn/icon.svg'),source_value,false,false,chapter_value,paid_value)
   on conflict (source_url) do nothing;
   get diagnostics affected = row_count;
   inserted := inserted + affected;
 end loop;
 return inserted;
end $$;

revoke all on function public.import_catalog(jsonb) from public, anon;
grant execute on function public.import_catalog(jsonb) to authenticated;
