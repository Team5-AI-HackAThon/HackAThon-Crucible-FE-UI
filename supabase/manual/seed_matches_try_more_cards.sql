-- ---------------------------------------------------------------------------
-- Extra match-card test data (projects + project_vc_matches).
-- ---------------------------------------------------------------------------
-- Prerequisites:
--   • 20250406140000_seed_feed_items.sql (Alex a111…, Sam a222…, Jordan b333…,
--     projects c111/c222/c333).
--   • Optional: 20250406240000_seed_more_demo_vcs_for_alex_matches.sql for
--     Meridian/Coastline/Nimbus/Atlas (b444–b777) — Section B uses them if present.
--
-- Match rows: `last_action` is NOT listed in INSERTs — it defaults to NULL in
-- Postgres. ON CONFLICT updates only scores/sentiment so re-runs do not wipe
-- a user’s Interested/Save/Pass choice.
--
-- Run in Supabase SQL Editor (or psql). Re-runnable: ON CONFLICT / DO blocks.
-- ---------------------------------------------------------------------------

-- ── Alex Rivera (a1111111-1111-4111-8111-111111111111): new projects ───────
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  (
    'caf00001-0000-4000-8000-000000000001',
    'a1111111-1111-4111-8111-111111111111',
    'Synthflow AI',
    'Remote',
    'Voice agents for regulated intake — SOC2 from day one.',
    '{"stage":"Seed","tags":["AI","B2B","Compliance"],"founder_title":"CEO"}'::jsonb
  ),
  (
    'caf00002-0000-4000-8000-000000000002',
    'a1111111-1111-4111-8111-111111111111',
    'Kepler Materials',
    'Detroit',
    'Lightweight composites for EV battery enclosures.',
    '{"stage":"Series A","tags":["Climate","Manufacturing"],"founder_title":"CEO"}'::jsonb
  ),
  (
    'caf00003-0000-4000-8000-000000000003',
    'a1111111-1111-4111-8111-111111111111',
    'SignalPath Security',
    'NYC',
    'Runtime policy engine for API traffic in zero-trust networks.',
    '{"stage":"Seed","tags":["Security","Infra"],"founder_title":"CEO"}'::jsonb
  ),
  (
    'caf00004-0000-4000-8000-000000000004',
    'a1111111-1111-4111-8111-111111111111',
    'Bloomstack',
    'Chicago',
    'People ops copilot for 50–500 person teams.',
    '{"stage":"Pre-Seed","tags":["HR Tech","B2B"],"founder_title":"CEO"}'::jsonb
  ),
  (
    'caf00005-0000-4000-8000-000000000005',
    'a1111111-1111-4111-8111-111111111111',
    'Arcadia Robotics',
    'Pittsburgh',
    'Warehouse pick-assist arms with human-scale safety.',
    '{"stage":"Seed","tags":["Robotics","Logistics"],"founder_title":"CEO"}'::jsonb
  ),
  (
    'caf00006-0000-4000-8000-000000000006',
    'a1111111-1111-4111-8111-111111111111',
    'Northstar Ledger',
    'Toronto',
    'Close-ready financial subledgers for multi-entity SaaS.',
    '{"stage":"Seed","tags":["Fintech","B2B"],"founder_title":"CEO"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hq_city = EXCLUDED.hq_city,
  one_line_pitch = EXCLUDED.one_line_pitch,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Optional industry links (ignore if lookup missing)
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'caf00001-0000-4000-8000-000000000001', id FROM public.industries WHERE slug = 'b2b-saas' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'caf00002-0000-4000-8000-000000000002', id FROM public.industries WHERE slug = 'climate' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'caf00003-0000-4000-8000-000000000003', id FROM public.industries WHERE slug = 'b2b-saas' LIMIT 1
ON CONFLICT DO NOTHING;

-- Align stage_id when project_stages exists
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00001-0000-4000-8000-000000000001' AND s.slug = 'seed';
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00002-0000-4000-8000-000000000002' AND s.slug = 'series-a';
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00003-0000-4000-8000-000000000003' AND s.slug = 'seed';
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00004-0000-4000-8000-000000000004' AND s.slug = 'pre-seed';
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00005-0000-4000-8000-000000000005' AND s.slug = 'seed';
UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf00006-0000-4000-8000-000000000006' AND s.slug = 'seed';

-- Jordan (b333) × each new Alex project — last_action omitted (NULL default)
INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  ('f5d00001-0000-4000-8000-000000000001', 'caf00001-0000-4000-8000-000000000001', 'b3333333-3333-4333-8333-333333333333', 91, 90, 89, 88, 90, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb),
  ('f5d00002-0000-4000-8000-000000000002', 'caf00002-0000-4000-8000-000000000002', 'b3333333-3333-4333-8333-333333333333', 87, 85, 88, 86, 87, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb),
  ('f5d00003-0000-4000-8000-000000000003', 'caf00003-0000-4000-8000-000000000003', 'b3333333-3333-4333-8333-333333333333', 83, 82, 84, 81, 83, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb),
  ('f5d00004-0000-4000-8000-000000000004', 'caf00004-0000-4000-8000-000000000004', 'b3333333-3333-4333-8333-333333333333', 79, 78, 80, 77, 78, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb),
  ('f5d00005-0000-4000-8000-000000000005', 'caf00005-0000-4000-8000-000000000005', 'b3333333-3333-4333-8333-333333333333', 88, 87, 89, 86, 88, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb),
  ('f5d00006-0000-4000-8000-000000000006', 'caf00006-0000-4000-8000-000000000006', 'b3333333-3333-4333-8333-333333333333', 85, 84, 86, 83, 85, '{"badges":["Demo","Try cards"],"summary":"Fresh row for button testing."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();

-- ── Sam Okonkwo (a222…): one extra project + Jordan match ──────────────────
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  (
    'caf10001-0000-4000-8000-000000000101',
    'a2222222-2222-4222-8222-222222222222',
    'Coral Labs',
    'Miami',
    'Water-quality sensors for coastal municipalities.',
    '{"stage":"Seed","tags":["Climate","GovTech"],"founder_title":"CEO"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hq_city = EXCLUDED.hq_city,
  one_line_pitch = EXCLUDED.one_line_pitch,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'caf10001-0000-4000-8000-000000000101', id FROM public.industries WHERE slug = 'climate' LIMIT 1
ON CONFLICT DO NOTHING;

UPDATE public.projects pr
SET stage_id = s.id
FROM public.project_stages s
WHERE pr.id = 'caf10001-0000-4000-8000-000000000101' AND s.slug = 'seed';

INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  (
    'f5d00101-0000-4000-8000-000000000101',
    'caf10001-0000-4000-8000-000000000101',
    'b3333333-3333-4333-8333-333333333333',
    86, 84, 88, 85, 86,
    '{"badges":["Demo","Sam founder"],"summary":"Login as feed-demo-founder2@crucible.test to try."}'::jsonb
  )
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();

-- ── Section B: extra VC rows on Synthflow (caf00001) if b444–b777 exist ────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = 'b4444444-4444-4111-8111-444444444444') THEN
    INSERT INTO public.project_vc_matches (
      id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
    )
    VALUES
      ('f5e00001-0000-4000-8000-000000000001', 'caf00001-0000-4000-8000-000000000001', 'b4444444-4444-4111-8111-444444444444', 90, 89, 91, 88, 89, '{"badges":["Extra VC"],"summary":"Requires 20250406240000 migration."}'::jsonb),
      ('f5e00002-0000-4000-8000-000000000002', 'caf00001-0000-4000-8000-000000000001', 'b5555555-5555-4111-8111-555555555555', 88, 87, 86, 88, 87, '{"badges":["Extra VC"],"summary":"Requires 20250406240000 migration."}'::jsonb),
      ('f5e00003-0000-4000-8000-000000000003', 'caf00001-0000-4000-8000-000000000001', 'b6666666-6666-4111-8111-666666666666', 84, 83, 85, 82, 84, '{"badges":["Extra VC"],"summary":"Requires 20250406240000 migration."}'::jsonb),
      ('f5e00004-0000-4000-8000-000000000004', 'caf00001-0000-4000-8000-000000000001', 'b7777777-7777-4111-8111-777777777777', 82, 81, 83, 80, 82, '{"badges":["Extra VC"],"summary":"Requires 20250406240000 migration."}'::jsonb)
    ON CONFLICT (project_id, vc_id) DO UPDATE SET
      match_score = EXCLUDED.match_score,
      thesis_fit = EXCLUDED.thesis_fit,
      stage_fit = EXCLUDED.stage_fit,
      sector_fit = EXCLUDED.sector_fit,
      team_score = EXCLUDED.team_score,
      sentiment_summary = EXCLUDED.sentiment_summary,
      updated_at = now();
  END IF;
END $$;

-- ── Section C: eight more Alex startups × Jordan (implicit NULL last_action) ─
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  ('caf20001-0000-4000-8000-000000000011', 'a1111111-1111-4111-8111-111111111111', 'Helio Commerce', 'Seattle', 'Headless checkout for B2B marketplaces.', '{"stage":"Seed","tags":["Fintech","B2B"],"founder_title":"CEO"}'::jsonb),
  ('caf20002-0000-4000-8000-000000000012', 'a1111111-1111-4111-8111-111111111111', 'Zenith Graph', 'Denver', 'Graph analytics API for fraud teams.', '{"stage":"Series A","tags":["Data","Security"],"founder_title":"CEO"}'::jsonb),
  ('caf20003-0000-4000-8000-000000000013', 'a1111111-1111-4111-8111-111111111111', 'Quarry Bio', 'San Diego', 'Protein design sandbox for academic labs.', '{"stage":"Pre-Seed","tags":["Bio"],"founder_title":"CEO"}'::jsonb),
  ('caf20004-0000-4000-8000-000000000014', 'a1111111-1111-4111-8111-111111111111', 'Tidal Payments', 'Atlanta', 'ACH orchestration for vertical SaaS.', '{"stage":"Seed","tags":["Fintech"],"founder_title":"CEO"}'::jsonb),
  ('caf20005-0000-4000-8000-000000000015', 'a1111111-1111-4111-8111-111111111111', 'Lark Defence', 'DC', 'Simulation sandboxes for drone swarm policy.', '{"stage":"Seed","tags":["Gov","Robotics"],"founder_title":"CEO"}'::jsonb),
  ('caf20006-0000-4000-8000-000000000016', 'a1111111-1111-4111-8111-111111111111', 'Magnet Studio', 'LA', 'Brand asset versioning for distributed teams.', '{"stage":"Pre-Seed","tags":["Creative","B2B"],"founder_title":"CEO"}'::jsonb),
  ('caf20007-0000-4000-8000-000000000017', 'a1111111-1111-4111-8111-111111111111', 'Cedar Health AI', 'Nashville', 'Prior-auth draft packets from clinical notes.', '{"stage":"Series A","tags":["Health"],"founder_title":"CEO"}'::jsonb),
  ('caf20008-0000-4000-8000-000000000018', 'a1111111-1111-4111-8111-111111111111', 'Fluxwork Ops', 'Phoenix', 'Shift scheduling with union rule packs.', '{"stage":"Seed","tags":["HR Tech"],"founder_title":"CEO"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hq_city = EXCLUDED.hq_city,
  one_line_pitch = EXCLUDED.one_line_pitch,
  metadata = EXCLUDED.metadata,
  updated_at = now();

UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20001-0000-4000-8000-000000000011' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20002-0000-4000-8000-000000000012' AND s.slug = 'series-a';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20003-0000-4000-8000-000000000013' AND s.slug = 'pre-seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20004-0000-4000-8000-000000000014' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20005-0000-4000-8000-000000000015' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20006-0000-4000-8000-000000000016' AND s.slug = 'pre-seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20007-0000-4000-8000-000000000017' AND s.slug = 'series-a';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'caf20008-0000-4000-8000-000000000018' AND s.slug = 'seed';

INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  ('f5f00001-0000-4000-8000-000000000011', 'caf20001-0000-4000-8000-000000000011', 'b3333333-3333-4333-8333-333333333333', 92, 91, 90, 89, 91, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00002-0000-4000-8000-000000000012', 'caf20002-0000-4000-8000-000000000012', 'b3333333-3333-4333-8333-333333333333', 88, 86, 89, 87, 88, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00003-0000-4000-8000-000000000013', 'caf20003-0000-4000-8000-000000000013', 'b3333333-3333-4333-8333-333333333333', 81, 80, 82, 79, 81, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00004-0000-4000-8000-000000000014', 'caf20004-0000-4000-8000-000000000014', 'b3333333-3333-4333-8333-333333333333', 86, 85, 87, 84, 86, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00005-0000-4000-8000-000000000015', 'caf20005-0000-4000-8000-000000000015', 'b3333333-3333-4333-8333-333333333333', 84, 83, 85, 82, 84, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00006-0000-4000-8000-000000000016', 'caf20006-0000-4000-8000-000000000016', 'b3333333-3333-4333-8333-333333333333', 77, 76, 78, 75, 77, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00007-0000-4000-8000-000000000017', 'caf20007-0000-4000-8000-000000000017', 'b3333333-3333-4333-8333-333333333333', 89, 88, 90, 87, 89, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb),
  ('f5f00008-0000-4000-8000-000000000018', 'caf20008-0000-4000-8000-000000000018', 'b3333333-3333-4333-8333-333333333333', 83, 82, 84, 81, 83, '{"badges":["Batch C"],"summary":"No last_action column in INSERT."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();

-- Optional: force NULL last_action on Section C rows only (mentions last_action):
-- UPDATE public.project_vc_matches SET last_action = NULL
-- WHERE id IN (
--   'f5f00001-0000-4000-8000-000000000011','f5f00002-0000-4000-8000-000000000012','f5f00003-0000-4000-8000-000000000013',
--   'f5f00004-0000-4000-8000-000000000014','f5f00005-0000-4000-8000-000000000015','f5f00006-0000-4000-8000-000000000016',
--   'f5f00007-0000-4000-8000-000000000017','f5f00008-0000-4000-8000-000000000018'
-- );
