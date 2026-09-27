-- 003a: quality-flag columns (Phase 3). DDL ONLY — backfill lives in 003b.
-- (Lesson, twice learned: the migration runner has silently skipped trailing
-- statements, so DDL and data changes ship as separate files, one purpose each.)
alter table generated_content
  add column if not exists quality_flags text[] not null default '{}',
  add column if not exists body_word_count integer,
  add column if not exists overlap_ratio double precision;
