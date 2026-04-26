-- Extra project_vc_matches for local / QA (more cards + varied last_action).
-- Prerequisites (UUIDs must exist):
--   • 20250406140000_seed_feed_items.sql (projects c111/c222/c333, VC b333, founders)
--   • 20250406240000_seed_more_demo_vcs_for_alex_matches.sql (VCs b444–b777 + first batch of matches)
--   • supabase/manual/seed_matches_try_more_cards.sql (projects caf*, caf10001, caf200**)
-- Safe to re-run: ON CONFLICT (project_id, vc_id) upserts scores + sentiment.

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
  -- Northwind clinical (c333): only had demo VC b333; add four more investors
  (
    'f6a00001-0000-4000-8000-000000000001',
    'c3333333-3333-4333-8333-333333333333',
    'b4444444-4444-4111-8111-444444444444',
    'interested',
    90,
    92,
    88,
    89,
    91,
    '{"badges":["Regulatory path","Clinical ops"],"summary":"Series-A biotech; strong trial narrative."}'::jsonb
  ),
  (
    'f6a00002-0000-4000-8000-000000000002',
    'c3333333-3333-4333-8333-333333333333',
    'b5555555-5555-4111-8111-555555555555',
    NULL,
    84,
    82,
    86,
    83,
    85,
    '{"badges":["Climate lens"],"summary":"Open match — try Interested / Pass / Save in UI."}'::jsonb
  ),
  (
    'f6a00003-0000-4000-8000-000000000003',
    'c3333333-3333-4333-8333-333333333333',
    'b6666666-6666-4111-8111-666666666666',
    'save',
    82,
    80,
    84,
    81,
    83,
    '{"badges":["Security posture"],"summary":"HIPAA angle interesting; parked for later."}'::jsonb
  ),
  (
    'f6a00004-0000-4000-8000-000000000004',
    'c3333333-3333-4333-8333-333333333333',
    'b7777777-7777-4111-8111-777777777777',
    'pass',
    71,
    73,
    68,
    70,
    72,
    '{"badges":["Stage"],"summary":"Slightly early vs Atlas mandate."}'::jsonb
  ),
  -- Sam founder (a222) project caf10001: extra VCs besides existing b333 row
  (
    'f6a00011-0000-4000-8000-000000000011',
    'caf10001-0000-4000-8000-000000000101',
    'b4444444-4444-4111-8111-444444444444',
    NULL,
    88,
    86,
    90,
    87,
    89,
    '{"badges":["Climate","GTM"],"summary":"Sam project — open row for founder2 login."}'::jsonb
  ),
  (
    'f6a00012-0000-4000-8000-000000000012',
    'caf10001-0000-4000-8000-000000000101',
    'b5555555-5555-4111-8111-555555555555',
    'interested',
    91,
    90,
    92,
    88,
    90,
    '{"badges":["Edge ML"],"summary":"Strong fit with Coastline thesis."}'::jsonb
  ),
  (
    'f6a00013-0000-4000-8000-000000000013',
    'caf10001-0000-4000-8000-000000000101',
    'b6666666-6666-4111-8111-666666666666',
    'save',
    80,
    79,
    82,
    78,
    81,
    '{"badges":["Compliance"],"summary":"Bookmarked for partner review."}'::jsonb
  ),
  (
    'f6a00014-0000-4000-8000-000000000014',
    'caf10001-0000-4000-8000-000000000101',
    'b7777777-7777-4111-8111-777777777777',
    NULL,
    76,
    75,
    78,
    74,
    77,
    '{"badges":["Operator"],"summary":"Another open row on same startup."}'::jsonb
  ),
  -- Alex extra caf rows: only b333 in seed; add b444–b777 per project for density
  (
    'f6a00021-0000-4000-8000-000000000021',
    'caf00002-0000-4000-8000-000000000002',
    'b4444444-4444-4111-8111-444444444444',
    NULL,
    89,
    88,
    90,
    87,
    88,
    '{"badges":["Batch","Synth"],"summary":"Extra density on caf00002."}'::jsonb
  ),
  (
    'f6a00022-0000-4000-8000-000000000022',
    'caf00002-0000-4000-8000-000000000002',
    'b5555555-5555-4111-8111-555555555555',
    'interested',
    93,
    94,
    91,
    92,
    93,
    '{"badges":["Batch","Synth"],"summary":"High conviction from Coastline."}'::jsonb
  ),
  (
    'f6a00023-0000-4000-8000-000000000023',
    'caf00002-0000-4000-8000-000000000002',
    'b6666666-6666-4111-8111-666666666666',
    'pass',
    74,
    76,
    72,
    73,
    75,
    '{"badges":["Batch","Synth"],"summary":"Pass for mandate fit."}'::jsonb
  ),
  (
    'f6a00024-0000-4000-8000-000000000024',
    'caf00002-0000-4000-8000-000000000002',
    'b7777777-7777-4111-8111-777777777777',
    'save',
    86,
    85,
    87,
    84,
    86,
    '{"badges":["Batch","Synth"],"summary":"Saved for later session."}'::jsonb
  ),
  (
    'f6a00031-0000-4000-8000-000000000031',
    'caf00003-0000-4000-8000-000000000003',
    'b4444444-4444-4111-8111-444444444444',
    'interested',
    87,
    88,
    85,
    86,
    87,
    '{"badges":["Batch"],"summary":"caf00003 × Meridian."}'::jsonb
  ),
  (
    'f6a00032-0000-4000-8000-000000000032',
    'caf00003-0000-4000-8000-000000000003',
    'b5555555-5555-4111-8111-555555555555',
    NULL,
    85,
    84,
    86,
    83,
    85,
    '{"badges":["Batch"],"summary":"caf00003 open."}'::jsonb
  ),
  (
    'f6a00033-0000-4000-8000-000000000033',
    'caf00003-0000-4000-8000-000000000003',
    'b6666666-6666-4111-8111-666666666666',
    NULL,
    81,
    80,
    82,
    79,
    81,
    '{"badges":["Batch"],"summary":"caf00003 open."}'::jsonb
  ),
  (
    'f6a00034-0000-4000-8000-000000000034',
    'caf00003-0000-4000-8000-000000000003',
    'b7777777-7777-4111-8111-777777777777',
    'interested',
    90,
    89,
    91,
    88,
    90,
    '{"badges":["Batch"],"summary":"caf00003 × Atlas."}'::jsonb
  ),
  (
    'f6a00041-0000-4000-8000-000000000041',
    'caf00004-0000-4000-8000-000000000004',
    'b4444444-4444-4111-8111-444444444444',
    NULL,
    78,
    77,
    80,
    76,
    79,
    '{"badges":["Batch"],"summary":"caf00004 — low score sandbox."}'::jsonb
  ),
  (
    'f6a00042-0000-4000-8000-000000000042',
    'caf00004-0000-4000-8000-000000000004',
    'b5555555-5555-4111-8111-555555555555',
    NULL,
    80,
    79,
    81,
    78,
    80,
    '{"badges":["Batch"],"summary":"caf00004 open."}'::jsonb
  ),
  (
    'f6a00043-0000-4000-8000-000000000043',
    'caf00004-0000-4000-8000-000000000004',
    'b6666666-6666-4111-8111-666666666666',
    'interested',
    88,
    87,
    89,
    86,
    88,
    '{"badges":["Batch"],"summary":"caf00004 interested."}'::jsonb
  ),
  (
    'f6a00044-0000-4000-8000-000000000044',
    'caf00004-0000-4000-8000-000000000004',
    'b7777777-7777-4111-8111-777777777777',
    'save',
    83,
    82,
    84,
    81,
    83,
    '{"badges":["Batch"],"summary":"caf00004 save."}'::jsonb
  ),
  (
    'f6a00051-0000-4000-8000-000000000051',
    'caf00005-0000-4000-8000-000000000005',
    'b4444444-4444-4111-8111-444444444444',
    'pass',
    69,
    70,
    67,
    68,
    70,
    '{"badges":["Batch"],"summary":"caf00005 pass."}'::jsonb
  ),
  (
    'f6a00052-0000-4000-8000-000000000052',
    'caf00005-0000-4000-8000-000000000005',
    'b5555555-5555-4111-8111-555555555555',
    NULL,
    91,
    90,
    92,
    89,
    91,
    '{"badges":["Batch"],"summary":"caf00005 open."}'::jsonb
  ),
  (
    'f6a00053-0000-4000-8000-000000000053',
    'caf00005-0000-4000-8000-000000000005',
    'b6666666-6666-4111-8111-666666666666',
    'interested',
    89,
    88,
    90,
    87,
    89,
    '{"badges":["Batch"],"summary":"caf00005 interested."}'::jsonb
  ),
  (
    'f6a00054-0000-4000-8000-000000000054',
    'caf00005-0000-4000-8000-000000000005',
    'b7777777-7777-4111-8111-777777777777',
    NULL,
    84,
    83,
    85,
    82,
    84,
    '{"badges":["Batch"],"summary":"caf00005 open."}'::jsonb
  ),
  (
    'f6a00061-0000-4000-8000-000000000061',
    'caf00006-0000-4000-8000-000000000006',
    'b4444444-4444-4111-8111-444444444444',
    'save',
    86,
    85,
    87,
    84,
    86,
    '{"badges":["Batch"],"summary":"caf00006 save."}'::jsonb
  ),
  (
    'f6a00062-0000-4000-8000-000000000062',
    'caf00006-0000-4000-8000-000000000006',
    'b5555555-5555-4111-8111-555555555555',
    NULL,
    88,
    87,
    89,
    86,
    88,
    '{"badges":["Batch"],"summary":"caf00006 open."}'::jsonb
  ),
  (
    'f6a00063-0000-4000-8000-000000000063',
    'caf00006-0000-4000-8000-000000000006',
    'b6666666-6666-4111-8111-666666666666',
    'interested',
    92,
    91,
    93,
    90,
    92,
    '{"badges":["Batch"],"summary":"caf00006 interested."}'::jsonb
  ),
  (
    'f6a00064-0000-4000-8000-000000000064',
    'caf00006-0000-4000-8000-000000000006',
    'b7777777-7777-4111-8111-777777777777',
    NULL,
    79,
    78,
    80,
    77,
    79,
    '{"badges":["Batch"],"summary":"caf00006 open."}'::jsonb
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
