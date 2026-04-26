-- ---------------------------------------------------------------------------
-- Deduplicate project_vc_matches: keep exactly ONE row per project_id.
-- ---------------------------------------------------------------------------
-- “One record per name” = one row per startup (`projects.id`), since each
-- project has a single display name. Extra rows for the same project (other
-- VCs) are removed.
--
-- Keeps the row with:
--   1) vc_id = Jordan demo (b333…) when that pair exists, else
--   2) most recently updated (updated_at DESC), else
--   3) smallest id (stable tie-break).
--
-- Run in Supabase SQL Editor. Optional: wrap in BEGIN; … ROLLBACK; to preview.
-- ---------------------------------------------------------------------------

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id
      ORDER BY
        CASE
          WHEN vc_id = 'b3333333-3333-4333-8333-333333333333'::uuid THEN 0
          ELSE 1
        END,
        updated_at DESC NULLS LAST,
        id
    ) AS rn
  FROM public.project_vc_matches
)
DELETE FROM public.project_vc_matches pvm
USING ranked r
WHERE pvm.id = r.id
  AND r.rn > 1;
