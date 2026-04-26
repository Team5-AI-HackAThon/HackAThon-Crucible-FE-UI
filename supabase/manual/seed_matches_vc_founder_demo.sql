-- ---------------------------------------------------------------------------
-- Demo data: project_vc_matches + connections aligned with inbox seed users.
-- More founder-side cards (extra demo VCs × Alex’s projects): apply migration
--   20250406240000_seed_more_demo_vcs_for_alex_matches.sql
-- Many NULL-action rows for UI testing: seed_matches_try_more_cards.sql
-- ---------------------------------------------------------------------------
-- Prerequisites (same UUIDs as repo migrations):
--   • 20250406140000_seed_feed_items.sql — auth users, profiles (via trigger),
--     projects c111/c222/c333, media_assets d111/d222/d333 (optional files in storage).
--   • 20250406160000_seed_inbox_conversations.sql — conversations + messages
--     between founders a111/a222 and VC b333.
--
-- UI: MatchesScreen reads project_vc_matches (see web/lib/data/matches.ts).
-- Inbox tab already reads conversations/messages via /api/inbox/conversations.
--
-- Media: do NOT re-insert media here. If you need real files, upload to paths:
--   d111 → crucible-media / a1111111-1111-4111-8111-111111111111/seed-demo-vanta.webm
--   d222 → .../seed-demo-northwind.webm
--   d333 → a2222222-2222-4222-8222-222222222222/seed-demo-helix.webm
-- ---------------------------------------------------------------------------

-- Demo IDs (do not change if you rely on feed + inbox seeds)
-- Founder Alex Rivera   = a1111111-1111-4111-8111-111111111111
-- Founder Sam Okonkwo   = a2222222-2222-4222-8222-222222222222
-- VC Jordan Lee         = b3333333-3333-4333-8333-333333333333
-- Projects: Vanta c111, Northwind c222, Helix c333

-- ---------------------------------------------------------------------------
-- project_vc_matches: VC b333 × each demo project (scores match static UI vibe)
-- ---------------------------------------------------------------------------
INSERT INTO public.project_vc_matches (
  id,
  project_id,
  vc_id,
  last_action,
  match_score,
  thesis_fit,
  stage_fit,
  sector_fit,
  team_score,
  sentiment_summary
)
VALUES
  (
    'f1111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    'interested',
    94,
    96,
    92,
    90,
    93,
    '{"badges":["Clear Leadership","High Energy"],"summary":"Strong GTM narrative; team cadence reads well on camera."}'::jsonb
  ),
  (
    'f2222222-2222-4222-8222-222222222222',
    'c2222222-2222-4222-8222-222222222222',
    'b3333333-3333-4333-8333-333333333333',
    'save',
    88,
    85,
    90,
    86,
    87,
    '{"badges":["Climate fit","Technical depth"],"summary":"Edge ML story aligns with thesis; cap table questions open."}'::jsonb
  ),
  (
    'f3333333-3333-4333-8333-333333333333',
    'c3333333-3333-4333-8333-333333333333',
    'b3333333-3333-4333-8333-333333333333',
    'interested',
    91,
    89,
    88,
    92,
    90,
    '{"badges":["Regulatory awareness"],"summary":"Clinical ops focus; follow up on trial timeline."}'::jsonb
  )
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  last_action = EXCLUDED.last_action,
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- connections: pipeline rows mirroring inbox threads (same people + projects)
-- ---------------------------------------------------------------------------
-- Partial unique indexes:
--   • (founder_id, vc_id) WHERE project_id IS NULL — at most one “open” intro
--   • (founder_id, vc_id, project_id) WHERE project_id IS NOT NULL — one per project
-- Use NOT EXISTS so the script is re-runnable without duplicate violations.

INSERT INTO public.connections (
  id,
  founder_id,
  vc_id,
  project_id,
  status,
  request_from_role,
  requested_by,
  pending_with
)
SELECT
  'ca000001-0000-4000-8000-000000000001',
  'a1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  'c1111111-1111-4111-8111-111111111111',
  'accepted',
  'investor'::public.app_role,
  'b3333333-3333-4333-8333-333333333333',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.connections x
  WHERE x.founder_id = 'a1111111-1111-4111-8111-111111111111'
    AND x.vc_id = 'b3333333-3333-4333-8333-333333333333'
    AND x.project_id = 'c1111111-1111-4111-8111-111111111111'
);

INSERT INTO public.connections (
  id,
  founder_id,
  vc_id,
  project_id,
  status,
  request_from_role,
  requested_by,
  pending_with
)
SELECT
  'ca000002-0000-4000-8000-000000000002',
  'a2222222-2222-4222-8222-222222222222',
  'b3333333-3333-4333-8333-333333333333',
  'c3333333-3333-4333-8333-333333333333',
  'pending',
  'founder'::public.app_role,
  'a2222222-2222-4222-8222-222222222222',
  'b3333333-3333-4333-8333-333333333333'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.connections x
  WHERE x.founder_id = 'a2222222-2222-4222-8222-222222222222'
    AND x.vc_id = 'b3333333-3333-4333-8333-333333333333'
    AND x.project_id = 'c3333333-3333-4333-8333-333333333333'
);

-- General (no project): at most one per (founder_id, vc_id).
INSERT INTO public.connections (
  id,
  founder_id,
  vc_id,
  project_id,
  status,
  request_from_role,
  requested_by,
  pending_with
)
SELECT
  'ca000003-0000-4000-8000-000000000003',
  'a1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  NULL,
  'requested',
  'investor'::public.app_role,
  'b3333333-3333-4333-8333-333333333333',
  'a1111111-1111-4111-8111-111111111111'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.connections x
  WHERE x.founder_id = 'a1111111-1111-4111-8111-111111111111'
    AND x.vc_id = 'b3333333-3333-4333-8333-333333333333'
    AND x.project_id IS NULL
);

-- ---------------------------------------------------------------------------
-- Optional: one vc_capital_mgmt row for demo VC (schema has no UNIQUE on vc_id)
-- ---------------------------------------------------------------------------
INSERT INTO public.vc_capital_mgmt (id, vc_id, initial_capital_fund, fund_balance, fund_invested)
SELECT
  'cb000001-0000-4000-8000-000000000001',
  'b3333333-3333-4333-8333-333333333333',
  120000000,
  84000000,
  36000000
WHERE NOT EXISTS (
  SELECT 1 FROM public.vc_capital_mgmt v WHERE v.id = 'cb000001-0000-4000-8000-000000000001'
);
