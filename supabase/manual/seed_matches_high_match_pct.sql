-- Demo rows with strong headline match %: many ≥90, several ≥96 (shows as 90%+ / 95%+ in UI).
-- `match_score` is what the app rounds for the card percentage (see web/lib/data/matches.ts).
-- Prerequisites: feed seed + 20250406240000 + seed_matches_try_more_cards + seed_matches_extra_batch (optional).
-- Re-runnable: ON CONFLICT updates only scores + sentiment — does NOT overwrite last_action.

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
  -- ── ≥96% headline match (above 95%) ─────────────────────────────────────
  ('f7a00001-0000-4000-8000-000000000001', 'c1111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333', NULL, 99, 98, 97, 99, 98, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 99% headline — thesis + stage aligned."}'::jsonb),
  ('f7a00002-0000-4000-8000-000000000002', 'c1111111-1111-4111-8111-111111111111', 'b5555555-5555-4111-8111-555555555555', NULL, 98, 97, 98, 96, 97, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 98% — climate + edge thesis overlap."}'::jsonb),
  ('f7a00003-0000-4000-8000-000000000003', 'c1111111-1111-4111-8111-111111111111', 'b6666666-6666-4111-8111-666666666666', NULL, 97, 96, 97, 98, 96, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 97% — compliance depth match."}'::jsonb),
  ('f7a00004-0000-4000-8000-000000000004', 'c2222222-2222-4222-8222-222222222222', 'b6666666-6666-4111-8111-666666666666', NULL, 99, 98, 99, 97, 98, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 99% — infra + security lens."}'::jsonb),
  ('f7a00005-0000-4000-8000-000000000005', 'c3333333-3333-4333-8333-333333333333', 'b4444444-4444-4111-8111-444444444444', NULL, 98, 99, 97, 98, 97, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 98% — clinical + regulatory fit."}'::jsonb),
  ('f7a00006-0000-4000-8000-000000000006', 'caf20001-0000-4000-8000-000000000011', 'b3333333-3333-4333-8333-333333333333', NULL, 97, 96, 98, 95, 97, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 97% — Helio Commerce × Jordan."}'::jsonb),
  ('f7a00007-0000-4000-8000-000000000007', 'caf20002-0000-4000-8000-000000000012', 'b3333333-3333-4333-8333-333333333333', NULL, 96, 95, 97, 96, 96, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 96% — Zenith Graph narrative."}'::jsonb),
  ('f7a00008-0000-4000-8000-000000000008', 'caf20003-0000-4000-8000-000000000013', 'b3333333-3333-4333-8333-333333333333', NULL, 99, 98, 99, 98, 99, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 99% — Quarry Bio wedge story."}'::jsonb),
  ('f7a00009-0000-4000-8000-000000000009', 'caf00001-0000-4000-8000-000000000001', 'b3333333-3333-4333-8333-333333333333', NULL, 98, 97, 99, 96, 98, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 98% — Synthflow AI flagship."}'::jsonb),
  ('f7a0000a-0000-4000-8000-00000000000a', 'caf00001-0000-4000-8000-000000000001', 'b4444444-4444-4111-8111-444444444444', NULL, 97, 98, 96, 97, 96, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 97% — Meridian × Synthflow."}'::jsonb),
  ('f7a0000b-0000-4000-8000-00000000000b', 'caf00001-0000-4000-8000-000000000001', 'b5555555-5555-4111-8111-555555555555', NULL, 96, 96, 95, 97, 95, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 96% — Coastline climate overlap."}'::jsonb),
  ('f7a0000c-0000-4000-8000-00000000000c', 'caf00002-0000-4000-8000-000000000002', 'b5555555-5555-4111-8111-555555555555', NULL, 99, 99, 98, 99, 98, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 99% — Kepler Materials × Coastline."}'::jsonb),

  -- ── 90–95% headline match (strong, but below 96) ───────────────────────────
  ('f7a0000d-0000-4000-8000-00000000000d', 'c1111111-1111-4111-8111-111111111111', 'b7777777-7777-4111-8111-777777777777', NULL, 94, 93, 95, 92, 94, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 94% — operator-led growth angle."}'::jsonb),
  ('f7a0000e-0000-4000-8000-00000000000e', 'c2222222-2222-4222-8222-222222222222', 'b4444444-4444-4111-8111-444444444444', NULL, 93, 92, 94, 91, 93, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 93% — edge ML thesis line."}'::jsonb),
  ('f7a0000f-0000-4000-8000-00000000000f', 'c2222222-2222-4222-8222-222222222222', 'b5555555-5555-4111-8111-555555555555', NULL, 95, 94, 96, 93, 95, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 95% — hardware-aware mandate."}'::jsonb),
  ('f7a00010-0000-4000-8000-000000000010', 'c3333333-3333-4333-8333-333333333333', 'b5555555-5555-4111-8111-555555555555', NULL, 92, 91, 93, 90, 92, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 92% — open row on Northwind."}'::jsonb),
  ('f7a00011-0000-4000-8000-000000000011', 'c3333333-3333-4333-8333-333333333333', 'b6666666-6666-4111-8111-666666666666', NULL, 91, 90, 92, 89, 91, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 91% — security posture hook."}'::jsonb),
  ('f7a00012-0000-4000-8000-000000000012', 'caf20004-0000-4000-8000-000000000014', 'b3333333-3333-4333-8333-333333333333', NULL, 94, 93, 95, 92, 94, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 94% — Tidal Payments."}'::jsonb),
  ('f7a00013-0000-4000-8000-000000000013', 'caf20005-0000-4000-8000-000000000015', 'b3333333-3333-4333-8333-333333333333', NULL, 93, 92, 94, 91, 93, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 93% — Lark Defence."}'::jsonb),
  ('f7a00014-0000-4000-8000-000000000014', 'caf20006-0000-4000-8000-000000000016', 'b3333333-3333-4333-8333-333333333333', NULL, 92, 91, 93, 90, 92, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 92% — Magnet Studio."}'::jsonb),
  ('f7a00015-0000-4000-8000-000000000015', 'caf20007-0000-4000-8000-000000000017', 'b3333333-3333-4333-8333-333333333333', NULL, 95, 94, 96, 93, 95, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 95% — Cedar Health AI."}'::jsonb),
  ('f7a00016-0000-4000-8000-000000000016', 'caf20008-0000-4000-8000-000000000018', 'b3333333-3333-4333-8333-333333333333', NULL, 91, 90, 92, 89, 91, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 91% — Fluxwork Ops."}'::jsonb),
  ('f7a00017-0000-4000-8000-000000000017', 'caf00003-0000-4000-8000-000000000003', 'b3333333-3333-4333-8333-333333333333', NULL, 94, 93, 95, 92, 94, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 94% — SignalPath Security."}'::jsonb),
  ('f7a00018-0000-4000-8000-000000000018', 'caf00004-0000-4000-8000-000000000004', 'b3333333-3333-4333-8333-333333333333', NULL, 90, 89, 91, 88, 90, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 90% — Bloomstack floor of 90s band."}'::jsonb),
  ('f7a00019-0000-4000-8000-000000000019', 'caf00005-0000-4000-8000-000000000005', 'b3333333-3333-4333-8333-333333333333', NULL, 93, 92, 94, 91, 93, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 93% — Arcadia Robotics."}'::jsonb),
  ('f7a0001a-0000-4000-8000-00000000001a', 'caf00006-0000-4000-8000-000000000006', 'b3333333-3333-4333-8333-333333333333', NULL, 92, 91, 93, 90, 92, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 92% — Northstar Ledger."}'::jsonb),
  ('f7a0001b-0000-4000-8000-00000000001b', 'caf10001-0000-4000-8000-000000000101', 'b3333333-3333-4333-8333-333333333333', NULL, 94, 93, 95, 92, 94, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 94% — Coral Labs (Sam)."}'::jsonb),
  ('f7a0001c-0000-4000-8000-00000000001c', 'caf20001-0000-4000-8000-000000000011', 'b4444444-4444-4111-8111-444444444444', NULL, 95, 94, 96, 93, 95, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 95% — Helio × Meridian."}'::jsonb),
  ('f7a0001d-0000-4000-8000-00000000001d', 'caf20002-0000-4000-8000-000000000012', 'b4444444-4444-4111-8111-444444444444', NULL, 92, 91, 93, 90, 92, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 92% — Zenith × Meridian."}'::jsonb),
  ('f7a0001e-0000-4000-8000-00000000001e', 'caf20007-0000-4000-8000-000000000017', 'b4444444-4444-4111-8111-444444444444', NULL, 93, 92, 94, 91, 93, '{"badges":["Strong 90s","Demo"],"summary":"Demo: 93% — Cedar × Meridian."}'::jsonb),
  ('f7a0001f-0000-4000-8000-00000000001f', 'caf10001-0000-4000-8000-000000000101', 'b5555555-5555-4111-8111-555555555555', NULL, 96, 95, 97, 94, 96, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 96% — Coral × Coastline."}'::jsonb),
  ('f7a00020-0000-4000-8000-000000000020', 'caf10001-0000-4000-8000-000000000101', 'b7777777-7777-4111-8111-777777777777', NULL, 97, 96, 98, 95, 97, '{"badges":["Elite fit","≥95%"],"summary":"Demo: 97% — Coral × Atlas."}'::jsonb)
ON CONFLICT (project_id, vc_id) DO UPDATE SET
  match_score = EXCLUDED.match_score,
  thesis_fit = EXCLUDED.thesis_fit,
  stage_fit = EXCLUDED.stage_fit,
  sector_fit = EXCLUDED.sector_fit,
  team_score = EXCLUDED.team_score,
  sentiment_summary = EXCLUDED.sentiment_summary,
  updated_at = now();
