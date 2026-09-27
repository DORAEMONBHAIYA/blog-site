-- 003b: backfill quality flags for pre-existing rows (Phase 3).
-- Run separately from 003a and verify row counts after (see AGENTS.md rule).
-- Floors: thin_body = body < 30 words; short_faq = avg answer < 3 words.
-- (overlap_ratio backfilled by scripts/backfill-overlap.ts logic at the time;
-- new rows compute all three in scripts/generate.ts.)
update generated_content c
set body_word_count = array_length(string_to_array(c.body, ' '), 1),
    quality_flags = coalesce((
      select array_agg(f) from (
        select unnest(
          case when array_length(string_to_array(c.body, ' '), 1) < 30
            then array['thin_body'] else array[]::text[] end
          ||
          case when (select avg(array_length(string_to_array(x->>'answer', ' '), 1))
                     from jsonb_array_elements(c.faq) x) < 3
            then array['short_faq'] else array[]::text[] end
        ) as f
      ) s
    ), array[]::text[]);
