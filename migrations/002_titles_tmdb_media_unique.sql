-- 002: TMDB movie/TV id namespaces collide, so uniqueness must cover both.
-- Phase 1 ingestion correctness fix (verified: titles_tmdb_media_unique present).
alter table titles drop constraint titles_tmdb_id_key;
alter table titles add constraint titles_tmdb_media_unique unique (tmdb_id, media_type);
