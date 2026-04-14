-- Demo data for tables not covered by feed + inbox seeds.
-- Requires: 20250406140000_seed_feed_items.sql (same user / project / media UUIDs).
-- Safe to re-run: fixed primary keys + ON CONFLICT / idempotent updates.

-- ---------------------------------------------------------------------------
-- Founder profiles (extended fields)
-- ---------------------------------------------------------------------------
UPDATE public.founder_profiles
SET
  bio = 'Former GTM lead at two B2B exits; building behavioral intelligence for regulated sales teams.',
  filtering_preferences = '{"sectors":["b2b-saas","ai-ml"],"stages":["seed","series-a"]}'::jsonb
WHERE user_id = 'a1111111-1111-4111-8111-111111111111';

UPDATE public.founder_profiles
SET
  bio = 'MD turned operator; focused on clinical trial velocity for mid-market biotech.',
  filtering_preferences = '{"sectors":["health-tech"],"stages":["series-a","series-b"]}'::jsonb
WHERE user_id = 'a2222222-2222-4222-8222-222222222222';

-- ---------------------------------------------------------------------------
-- VC profile + fund row (optional MVP tables)
-- ---------------------------------------------------------------------------
UPDATE public.vc_profiles
SET
  firm_name = 'Harbor Peak Ventures',
  intro_video_storage_path = NULL,
  interested_areas = ARRAY['B2B SaaS', 'Climate', 'Health Tech'],
  vc_score = 4.7,
  filtering_preferences = '{"check_size_min":250000,"check_size_max":2000000}'::jsonb
WHERE user_id = 'b3333333-3333-4333-8333-333333333333';

INSERT INTO public.vc_capital_mgmt (id, vc_id, initial_capital_fund, fund_balance, fund_invested)
VALUES (
  'f3000001-0000-4000-8000-000000000001',
  'b3333333-3333-4333-8333-333333333333',
  25000000,
  18200000,
  6800000
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Link projects to lookup stage (project_stages seeded in 20250405000001)
-- ---------------------------------------------------------------------------
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'c1111111-1111-4111-8111-111111111111' AND s.slug = 'seed';

UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'c2222222-2222-4222-8222-222222222222' AND s.slug = 'pre-seed';

UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'c3333333-3333-4333-8333-333333333333' AND s.slug = 'series-a';

-- ---------------------------------------------------------------------------
-- project_vc_matches (one row per project ↔ demo VC; exercises all last_action values)
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
    'f2000001-0000-4000-8000-000000000001',
    'c1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    'interested',
    0.91,
    0.93,
    0.88,
    0.90,
    0.89,
    '{"tone":"confident","highlights":["clarity","structure"]}'::jsonb
  ),
  (
    'f2000002-0000-4000-8000-000000000002',
    'c2222222-2222-4222-8222-222222222222',
    'b3333333-3333-4333-8333-333333333333',
    'pass',
    0.62,
    0.70,
    0.55,
    0.58,
    0.66,
    '{"tone":"technical","note":"stage early for our mandate"}'::jsonb
  ),
  (
    'f2000003-0000-4000-8000-000000000003',
    'c3333333-3333-4333-8333-333333333333',
    'b3333333-3333-4333-8333-333333333333',
    'save',
    0.87,
    0.85,
    0.82,
    0.90,
    0.84,
    '{"tone":"measured","follow_up":"compare CRO workflows"}'::jsonb
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
-- connections (one per project-scoped pipeline; respects partial unique indexes)
-- ---------------------------------------------------------------------------
INSERT INTO public.connections (
  id,
  founder_id,
  vc_id,
  project_id,
  status,
  request_from_role,
  requested_by,
  accepted_by,
  pending_with,
  created_at,
  updated_at
)
VALUES
  (
    'f1000001-0000-4000-8000-000000000001',
    'a1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    'c1111111-1111-4111-8111-111111111111',
    'accepted',
    'founder',
    'a1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    NULL,
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    'f1000002-0000-4000-8000-000000000002',
    'a1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    'c2222222-2222-4222-8222-222222222222',
    'pending',
    'investor',
    'b3333333-3333-4333-8333-333333333333',
    NULL,
    'b3333333-3333-4333-8333-333333333333',
    now() - interval '3 days',
    now() - interval '12 hours'
  ),
  (
    'f1000003-0000-4000-8000-000000000003',
    'a2222222-2222-4222-8222-222222222222',
    'b3333333-3333-4333-8333-333333333333',
    'c3333333-3333-4333-8333-333333333333',
    'requested',
    'founder',
    'a2222222-2222-4222-8222-222222222222',
    NULL,
    'b3333333-3333-4333-8333-333333333333',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'f1000004-0000-4000-8000-000000000004',
    'a1111111-1111-4111-8111-111111111111',
    'b3333333-3333-4333-8333-333333333333',
    NULL,
    'declined',
    'investor',
    'b3333333-3333-4333-8333-333333333333',
    NULL,
    NULL,
    now() - interval '10 days',
    now() - interval '8 days'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  request_from_role = EXCLUDED.request_from_role,
  requested_by = EXCLUDED.requested_by,
  accepted_by = EXCLUDED.accepted_by,
  pending_with = EXCLUDED.pending_with,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- sentiment_outputs (one per published media asset in feed seed)
-- ---------------------------------------------------------------------------
INSERT INTO public.sentiment_outputs (
  id,
  media_asset_id,
  scores,
  raw_model_version,
  created_at
)
VALUES
  (
    'f4000001-0000-4000-8000-000000000001',
    'd1111111-1111-4111-8111-111111111111',
    '{"communication":0.88,"leadership":0.82,"energy":0.91,"clarity":0.86}'::jsonb,
    'crucible-sentiment-demo-v1',
    now() - interval '2 hours'
  ),
  (
    'f4000002-0000-4000-8000-000000000002',
    'd2222222-2222-4222-8222-222222222222',
    '{"communication":0.79,"leadership":0.85,"energy":0.77,"clarity":0.81}'::jsonb,
    'crucible-sentiment-demo-v1',
    now() - interval '5 hours'
  ),
  (
    'f4000003-0000-4000-8000-000000000003',
    'd3333333-3333-4333-8333-333333333333',
    '{"communication":0.84,"leadership":0.80,"energy":0.83,"clarity":0.89}'::jsonb,
    'crucible-sentiment-demo-v1',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;
