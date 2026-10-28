-- Run after 004_live_subtitles.sql.
-- Supports source-linked catalog records and text IDs for virtual episodes.
begin;

alter table public.series
  add column if not exists source_book_id text;

alter table public.episodes
  alter column video_url drop not null;
alter table public.episodes
  drop constraint if exists episodes_video_url_check;
alter table public.episodes
  add constraint episodes_video_url_check
  check (video_url is null or video_url ~ '^https://');

-- UUID foreign keys cannot reference a text column. Virtual episode IDs do
-- not exist in public.episodes, so this relationship is intentionally removed.
-- Existing UUID IDs remain intact as strings; user_id FK, primary key and RLS
-- remain. Episode deletion no longer cascades to progress: callers must clean
-- up progress rows for deleted local episodes when required.
alter table public.progress
  drop constraint if exists progress_episode_id_fkey;
alter table public.progress
  alter column episode_id type text using episode_id::text;

commit;
