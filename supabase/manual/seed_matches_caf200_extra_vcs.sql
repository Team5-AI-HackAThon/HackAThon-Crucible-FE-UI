-- More matching test data: caf20001–caf20008 (Alex) × Meridian/Coastline/Nimbus/Atlas (b444–b777).
-- Jordan (b333) rows already exist in seed_matches_try_more_cards.sql — this adds four investors per startup.
-- Prerequisites: seed_matches_try_more_cards.sql + 20250406240000_seed_more_demo_vcs_for_alex_matches.sql
-- Re-runnable: ON CONFLICT (project_id, vc_id) DO UPDATE …

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
  ('f6b00101-0000-4000-8000-000000000001', 'caf20001-0000-4000-8000-000000000011', 'b4444444-4444-4111-8111-444444444444', NULL, 90, 89, 91, 88, 90, '{"badges":["Batch D","GTM"],"summary":"Open — B2B marketplace checkout."}'::jsonb),
  ('f6b00102-0000-4000-8000-000000000002', 'caf20001-0000-4000-8000-000000000011', 'b5555555-5555-4111-8111-555555555555', NULL, 87, 86, 88, 85, 87, '{"badges":["Batch D","Climate"],"summary":"Open — fintech angle on rails."}'::jsonb),
  ('f6b00103-0000-4000-8000-000000000003', 'caf20001-0000-4000-8000-000000000011', 'b6666666-6666-4111-8111-666666666666', 'save', 84, 83, 85, 82, 84, '{"badges":["Batch D","Compliance"],"summary":"SOC2 narrative bookmarked."}'::jsonb),
  ('f6b00104-0000-4000-8000-000000000004', 'caf20001-0000-4000-8000-000000000011', 'b7777777-7777-4111-8111-777777777777', NULL, 81, 80, 82, 79, 81, '{"badges":["Batch D","Ops"],"summary":"Open — wants GTM deck v2."}'::jsonb),

  ('f6b00105-0000-4000-8000-000000000005', 'caf20002-0000-4000-8000-000000000012', 'b4444444-4444-4111-8111-444444444444', NULL, 89, 88, 90, 87, 89, '{"badges":["Batch D","Fraud"],"summary":"Open — graph API for risk teams."}'::jsonb),
  ('f6b00106-0000-4000-8000-000000000006', 'caf20002-0000-4000-8000-000000000012', 'b5555555-5555-4111-8111-555555555555', 'interested', 93, 92, 94, 91, 93, '{"badges":["Batch D","Data"],"summary":"Series A fit; scheduling IC."}'::jsonb),
  ('f6b00107-0000-4000-8000-000000000007', 'caf20002-0000-4000-8000-000000000012', 'b6666666-6666-4111-8111-666666666666', NULL, 85, 84, 86, 83, 85, '{"badges":["Batch D","Security"],"summary":"Open — infra story strong."}'::jsonb),
  ('f6b00108-0000-4000-8000-000000000008', 'caf20002-0000-4000-8000-000000000012', 'b7777777-7777-4111-8111-777777777777', NULL, 80, 79, 81, 78, 80, '{"badges":["Batch D"],"summary":"Open — follow-on metrics ask."}'::jsonb),

  ('f6b00109-0000-4000-8000-000000000009', 'caf20003-0000-4000-8000-000000000013', 'b4444444-4444-4111-8111-444444444444', NULL, 82, 81, 83, 80, 82, '{"badges":["Batch D","Bio"],"summary":"Open — pre-seed tooling play."}'::jsonb),
  ('f6b0010a-0000-4000-8000-00000000000a', 'caf20003-0000-4000-8000-000000000013', 'b5555555-5555-4111-8111-555555555555', NULL, 79, 78, 80, 77, 79, '{"badges":["Batch D"],"summary":"Open — lab workflow wedge."}'::jsonb),
  ('f6b0010b-0000-4000-8000-00000000000b', 'caf20003-0000-4000-8000-000000000013', 'b6666666-6666-4111-8111-666666666666', 'pass', 72, 73, 70, 71, 72, '{"badges":["Batch D"],"summary":"Pass — outside current bio mandate."}'::jsonb),
  ('f6b0010c-0000-4000-8000-00000000000c', 'caf20003-0000-4000-8000-000000000013', 'b7777777-7777-4111-8111-777777777777', NULL, 77, 76, 78, 75, 77, '{"badges":["Batch D"],"summary":"Open — operator empathy callout."}'::jsonb),

  ('f6b0010d-0000-4000-8000-00000000000d', 'caf20004-0000-4000-8000-000000000014', 'b4444444-4444-4111-8111-444444444444', NULL, 88, 87, 89, 86, 88, '{"badges":["Batch D","Fintech"],"summary":"Open — ACH vertical SaaS."}'::jsonb),
  ('f6b0010e-0000-4000-8000-00000000000e', 'caf20004-0000-4000-8000-000000000014', 'b5555555-5555-4111-8111-555555555555', NULL, 86, 85, 87, 84, 86, '{"badges":["Batch D"],"summary":"Open — payments orchestration."}'::jsonb),
  ('f6b0010f-0000-4000-8000-00000000000f', 'caf20004-0000-4000-8000-000000000014', 'b6666666-6666-4111-8111-666666666666', NULL, 83, 82, 84, 81, 83, '{"badges":["Batch D"],"summary":"Open — API moat questions."}'::jsonb),
  ('f6b00110-0000-4000-8000-000000000010', 'caf20004-0000-4000-8000-000000000014', 'b7777777-7777-4111-8111-777777777777', 'save', 81, 80, 82, 79, 81, '{"badges":["Batch D"],"summary":"Saved — partner sync on pricing."}'::jsonb),

  ('f6b00111-0000-4000-8000-000000000011', 'caf20005-0000-4000-8000-000000000015', 'b4444444-4444-4111-8111-444444444444', NULL, 91, 90, 92, 89, 91, '{"badges":["Batch D","Gov"],"summary":"Open — drone policy sandbox."}'::jsonb),
  ('f6b00112-0000-4000-8000-000000000012', 'caf20005-0000-4000-8000-000000000015', 'b5555555-5555-4111-8111-555555555555', NULL, 87, 86, 88, 85, 87, '{"badges":["Batch D","Robotics"],"summary":"Open — sim + hardware story."}'::jsonb),
  ('f6b00113-0000-4000-8000-000000000013', 'caf20005-0000-4000-8000-000000000015', 'b6666666-6666-4111-8111-666666666666', NULL, 84, 83, 85, 82, 84, '{"badges":["Batch D"],"summary":"Open — security review path."}'::jsonb),
  ('f6b00114-0000-4000-8000-000000000014', 'caf20005-0000-4000-8000-000000000015', 'b7777777-7777-4111-8111-777777777777', NULL, 79, 78, 80, 77, 79, '{"badges":["Batch D"],"summary":"Open — procurement cycle long."}'::jsonb),

  ('f6b00115-0000-4000-8000-000000000015', 'caf20006-0000-4000-8000-000000000016', 'b4444444-4444-4111-8111-444444444444', NULL, 78, 77, 79, 76, 78, '{"badges":["Batch D","Creative"],"summary":"Open — brand versioning PMF."}'::jsonb),
  ('f6b00116-0000-4000-8000-000000000016', 'caf20006-0000-4000-8000-000000000016', 'b5555555-5555-4111-8111-555555555555', NULL, 75, 74, 76, 73, 75, '{"badges":["Batch D"],"summary":"Open — crowded category."}'::jsonb),
  ('f6b00117-0000-4000-8000-000000000017', 'caf20006-0000-4000-8000-000000000016', 'b6666666-6666-4111-8111-666666666666', NULL, 82, 81, 83, 80, 82, '{"badges":["Batch D"],"summary":"Open — enterprise design partners."}'::jsonb),
  ('f6b00118-0000-4000-8000-000000000018', 'caf20006-0000-4000-8000-000000000016', 'b7777777-7777-4111-8111-777777777777', 'interested', 86, 85, 87, 84, 86, '{"badges":["Batch D"],"summary":"Interested — workflow automation fit."}'::jsonb),

  ('f6b00119-0000-4000-8000-000000000019', 'caf20007-0000-4000-8000-000000000017', 'b4444444-4444-4111-8111-444444444444', NULL, 92, 91, 93, 90, 92, '{"badges":["Batch D","Health"],"summary":"Open — prior auth automation."}'::jsonb),
  ('f6b0011a-0000-4000-8000-00000000001a', 'caf20007-0000-4000-8000-000000000017', 'b5555555-5555-4111-8111-555555555555', NULL, 88, 87, 89, 86, 88, '{"badges":["Batch D"],"summary":"Open — HIPAA workflow depth."}'::jsonb),
  ('f6b0011b-0000-4000-8000-00000000001b', 'caf20007-0000-4000-8000-000000000017', 'b6666666-6666-4111-8111-666666666666', 'save', 85, 84, 86, 83, 85, '{"badges":["Batch D"],"summary":"Saved — clinical advisor intro."}'::jsonb),
  ('f6b0011c-0000-4000-8000-00000000001c', 'caf20007-0000-4000-8000-000000000017', 'b7777777-7777-4111-8111-777777777777', NULL, 83, 82, 84, 81, 83, '{"badges":["Batch D"],"summary":"Open — payer integration risk."}'::jsonb),

  ('f6b0011d-0000-4000-8000-00000000001d', 'caf20008-0000-4000-8000-000000000018', 'b4444444-4444-4111-8111-444444444444', NULL, 86, 85, 87, 84, 86, '{"badges":["Batch D","HR"],"summary":"Open — union rules engine."}'::jsonb),
  ('f6b0011e-0000-4000-8000-00000000001e', 'caf20008-0000-4000-8000-000000000018', 'b5555555-5555-4111-8111-555555555555', NULL, 84, 83, 85, 82, 84, '{"badges":["Batch D"],"summary":"Open — shift scheduling wedge."}'::jsonb),
  ('f6b0011f-0000-4000-8000-00000000001f', 'caf20008-0000-4000-8000-000000000018', 'b6666666-6666-4111-8111-666666666666', NULL, 81, 80, 82, 79, 81, '{"badges":["Batch D"],"summary":"Open — enterprise HRIS hooks."}'::jsonb),
  ('f6b00120-0000-4000-8000-000000000020', 'caf20008-0000-4000-8000-000000000018', 'b7777777-7777-4111-8111-777777777777', NULL, 77, 76, 78, 75, 77, '{"badges":["Batch D"],"summary":"Open — land-and-expand motion."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  last_action = EXCLUDED.last_action,
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();
