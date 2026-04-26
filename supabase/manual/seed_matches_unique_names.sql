-- ---------------------------------------------------------------------------
-- Test data: uniquely named startups + one project_vc_matches row each (Jordan).
-- ---------------------------------------------------------------------------
-- Prerequisites: 20250406140000_seed_feed_items.sql (Alex a111…, Sam a222…,
-- Jordan b333…). Optional: industries + project_stages from earlier migrations.
--
-- • 10 projects for Alex — distinct names, no overlap with other repo seeds.
-- • 2 projects for Sam — distinct names.
-- • One match per project × vc b333; `last_action` omitted → NULL (action UI).
--
-- Re-runnable: ON CONFLICT updates project copy; match upsert does not set
-- last_action so existing choices are preserved on conflict.
-- ---------------------------------------------------------------------------

-- ── Alex Rivera: uniquely named projects ───────────────────────────────────
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  ('cbaaa001-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'Nighthawk Telemetry', 'Denver', 'Fleet-wide CAN bus anomaly scoring for heavy OEMs.', '{"stage":"Seed","tags":["Mobility","B2B"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa002-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'Cobalt Circuit Foundry', 'Austin', 'Tape-out scheduling copilot for fabless chip teams.', '{"stage":"Series A","tags":["Semiconductors"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa003-0000-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111', 'Vesper Mobility Labs', 'Portland', 'Micromobility battery swap networks with grid-aware pricing.', '{"stage":"Pre-Seed","tags":["Climate","Hardware"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa004-0000-4000-8000-000000000004', 'a1111111-1111-4111-8111-111111111111', 'Harborline Treasury OS', 'Boston', 'Cash positioning for mid-market CFOs across multi-bank stacks.', '{"stage":"Seed","tags":["Fintech","B2B"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa005-0000-4000-8000-000000000005', 'a1111111-1111-4111-8111-111111111111', 'Granite Stack Observability', 'NYC', 'SLO burn-down narratives tied to deploy trains and incidents.', '{"stage":"Seed","tags":["DevTools","Infra"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa006-0000-4000-8000-000000000006', 'a1111111-1111-4111-8111-111111111111', 'Silverpine Care Routing', 'Minneapolis', 'Home-health visit windows that respect union mileage caps.', '{"stage":"Series A","tags":["Health","Gov"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa007-0000-4000-8000-000000000007', 'a1111111-1111-4111-8111-111111111111', 'Brassband Rights Cloud', 'Nashville', 'Mechanical rights clearance for short-form video at scale.', '{"stage":"Pre-Seed","tags":["Media","B2B"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa008-0000-4000-8000-000000000008', 'a1111111-1111-4111-8111-111111111111', 'Copperfield Carbon Ledger', 'Houston', 'MRV-grade audit trails for voluntary carbon retirements.', '{"stage":"Seed","tags":["Climate","Fintech"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa009-0000-4000-8000-000000000009', 'a1111111-1111-4111-8111-111111111111', 'Ironwood Perimeter AI', 'Arlington', 'Edge vision packs for base logistics without cloud egress.', '{"stage":"Seed","tags":["Defense","ML"],"founder_title":"CEO"}'::jsonb),
  ('cbaaa00a-0000-4000-8000-00000000000a', 'a1111111-1111-4111-8111-111111111111', 'Ambergrain Yield Maps', 'Omaha', 'Sub-field nitrogen prescriptions from combine telemetry.', '{"stage":"Pre-Seed","tags":["AgTech"],"founder_title":"CEO"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hq_city = EXCLUDED.hq_city,
  one_line_pitch = EXCLUDED.one_line_pitch,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'cbaaa001-0000-4000-8000-000000000001', id FROM public.industries WHERE slug = 'b2b-saas' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'cbaaa004-0000-4000-8000-000000000004', id FROM public.industries WHERE slug = 'b2b-saas' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'cbaaa008-0000-4000-8000-000000000008', id FROM public.industries WHERE slug = 'climate' LIMIT 1
ON CONFLICT DO NOTHING;

UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa001-0000-4000-8000-000000000001' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa002-0000-4000-8000-000000000002' AND s.slug = 'series-a';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa003-0000-4000-8000-000000000003' AND s.slug = 'pre-seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa004-0000-4000-8000-000000000004' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa005-0000-4000-8000-000000000005' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa006-0000-4000-8000-000000000006' AND s.slug = 'series-a';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa007-0000-4000-8000-000000000007' AND s.slug = 'pre-seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa008-0000-4000-8000-000000000008' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa009-0000-4000-8000-000000000009' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbaaa00a-0000-4000-8000-00000000000a' AND s.slug = 'pre-seed';

INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  ('ebaa0001-0000-4000-8000-000000000001', 'cbaaa001-0000-4000-8000-000000000001', 'b3333333-3333-4333-8333-333333333333', 90, 88, 91, 87, 89, '{"badges":["Unique seed"],"summary":"cbaaa001 Nighthawk Telemetry."}'::jsonb),
  ('ebaa0002-0000-4000-8000-000000000002', 'cbaaa002-0000-4000-8000-000000000002', 'b3333333-3333-4333-8333-333333333333', 88, 86, 89, 85, 88, '{"badges":["Unique seed"],"summary":"cbaaa002 Cobalt Circuit Foundry."}'::jsonb),
  ('ebaa0003-0000-4000-8000-000000000003', 'cbaaa003-0000-4000-8000-000000000003', 'b3333333-3333-4333-8333-333333333333', 82, 81, 83, 80, 82, '{"badges":["Unique seed"],"summary":"cbaaa003 Vesper Mobility Labs."}'::jsonb),
  ('ebaa0004-0000-4000-8000-000000000004', 'cbaaa004-0000-4000-8000-000000000004', 'b3333333-3333-4333-8333-333333333333', 91, 90, 92, 89, 91, '{"badges":["Unique seed"],"summary":"cbaaa004 Harborline Treasury OS."}'::jsonb),
  ('ebaa0005-0000-4000-8000-000000000005', 'cbaaa005-0000-4000-8000-000000000005', 'b3333333-3333-4333-8333-333333333333', 86, 85, 87, 84, 86, '{"badges":["Unique seed"],"summary":"cbaaa005 Granite Stack Observability."}'::jsonb),
  ('ebaa0006-0000-4000-8000-000000000006', 'cbaaa006-0000-4000-8000-000000000006', 'b3333333-3333-4333-8333-333333333333', 89, 88, 90, 87, 89, '{"badges":["Unique seed"],"summary":"cbaaa006 Silverpine Care Routing."}'::jsonb),
  ('ebaa0007-0000-4000-8000-000000000007', 'cbaaa007-0000-4000-8000-000000000007', 'b3333333-3333-4333-8333-333333333333', 79, 78, 80, 77, 79, '{"badges":["Unique seed"],"summary":"cbaaa007 Brassband Rights Cloud."}'::jsonb),
  ('ebaa0008-0000-4000-8000-000000000008', 'cbaaa008-0000-4000-8000-000000000008', 'b3333333-3333-4333-8333-333333333333', 87, 86, 88, 85, 87, '{"badges":["Unique seed"],"summary":"cbaaa008 Copperfield Carbon Ledger."}'::jsonb),
  ('ebaa0009-0000-4000-8000-000000000009', 'cbaaa009-0000-4000-8000-000000000009', 'b3333333-3333-4333-8333-333333333333', 84, 83, 85, 82, 84, '{"badges":["Unique seed"],"summary":"cbaaa009 Ironwood Perimeter AI."}'::jsonb),
  ('ebaa000a-0000-4000-8000-00000000000a', 'cbaaa00a-0000-4000-8000-00000000000a', 'b3333333-3333-4333-8333-333333333333', 81, 80, 82, 79, 81, '{"badges":["Unique seed"],"summary":"cbaaa00a Ambergrain Yield Maps."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();

-- ── Sam Okonkwo: two more uniquely named projects ──────────────────────────
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  ('cbbaa001-0000-4000-8000-000000000101', 'a2222222-2222-4222-8222-222222222222', 'Obsidian Protocol Works', 'Seattle', 'Formal verification bundles for WASM smart-contract upgrades.', '{"stage":"Seed","tags":["Crypto","Infra"],"founder_title":"CEO"}'::jsonb),
  ('cbbaa002-0000-4000-8000-000000000102', 'a2222222-2222-4222-8222-222222222222', 'NebulaForge Clinical', 'Raleigh', 'Protocol deviation drafts from EDC diff streams.', '{"stage":"Series A","tags":["Health","B2B"],"founder_title":"CEO"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hq_city = EXCLUDED.hq_city,
  one_line_pitch = EXCLUDED.one_line_pitch,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'cbbaa002-0000-4000-8000-000000000102', id FROM public.industries WHERE slug = 'health-tech' LIMIT 1
ON CONFLICT DO NOTHING;

UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbbaa001-0000-4000-8000-000000000101' AND s.slug = 'seed';
UPDATE public.projects pr SET stage_id = s.id FROM public.project_stages s
WHERE pr.id = 'cbbaa002-0000-4000-8000-000000000102' AND s.slug = 'series-a';

INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  ('ebbf0001-0000-4000-8000-000000000101', 'cbbaa001-0000-4000-8000-000000000101', 'b3333333-3333-4333-8333-333333333333', 85, 84, 86, 83, 85, '{"badges":["Sam unique"],"summary":"cbbaa001 Obsidian Protocol Works."}'::jsonb),
  ('ebbf0002-0000-4000-8000-000000000102', 'cbbaa002-0000-4000-8000-000000000102', 'b3333333-3333-4333-8333-333333333333', 88, 87, 89, 86, 88, '{"badges":["Sam unique"],"summary":"cbbaa002 NebulaForge Clinical."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();
