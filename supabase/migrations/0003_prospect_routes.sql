-- Shehena prospects: where they load goods and where they deliver.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
alter table public.prospects add column if not exists route_origin text default '';
alter table public.prospects add column if not exists route_destinations text[] not null default '{}';
