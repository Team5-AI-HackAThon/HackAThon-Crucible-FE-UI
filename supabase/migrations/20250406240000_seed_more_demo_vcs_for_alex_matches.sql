-- Extra demo investors + project_vc_matches so founder Alex (a111…) sees many match cards
-- (Vanta c111 + Northwind c222 × Jordan b333 + four new VCs). Requires 20250406140000 feed seed.
-- Logins optional: same password as other feed seeds (DemoPassword123!); not on email allowlist by default.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_instance uuid;
  v_pw text := extensions.crypt('DemoPassword123!', extensions.gen_salt('bf'));
BEGIN
  SELECT id INTO v_instance FROM auth.instances LIMIT 1;
  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- VC: Meridian (b444…)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-vc-meridian@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'b4444444-4444-4111-8111-444444444444', 'authenticated', 'authenticated',
      'feed-demo-vc-meridian@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Priya Shah"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), 'b4444444-4444-4111-8111-444444444444',
      jsonb_build_object('sub', 'b4444444-4444-4111-8111-444444444444', 'email', 'feed-demo-vc-meridian@crucible.test'),
      'email', 'b4444444-4444-4111-8111-444444444444', now(), now(), now()
    );
  END IF;

  -- VC: Coastline (b555…)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-vc-coastline@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'b5555555-5555-4111-8111-555555555555', 'authenticated', 'authenticated',
      'feed-demo-vc-coastline@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Chris Wong"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), 'b5555555-5555-4111-8111-555555555555',
      jsonb_build_object('sub', 'b5555555-5555-4111-8111-555555555555', 'email', 'feed-demo-vc-coastline@crucible.test'),
      'email', 'b5555555-5555-4111-8111-555555555555', now(), now(), now()
    );
  END IF;

  -- VC: Nimbus (b666…)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-vc-nimbus@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'b6666666-6666-4111-8111-666666666666', 'authenticated', 'authenticated',
      'feed-demo-vc-nimbus@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Morgan Ellis"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), 'b6666666-6666-4111-8111-666666666666',
      jsonb_build_object('sub', 'b6666666-6666-4111-8111-666666666666', 'email', 'feed-demo-vc-nimbus@crucible.test'),
      'email', 'b6666666-6666-4111-8111-666666666666', now(), now(), now()
    );
  END IF;

  -- VC: Atlas (b777…)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-vc-atlas@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'b7777777-7777-4111-8111-777777777777', 'authenticated', 'authenticated',
      'feed-demo-vc-atlas@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Jamie Park"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), 'b7777777-7777-4111-8111-777777777777',
      jsonb_build_object('sub', 'b7777777-7777-4111-8111-777777777777', 'email', 'feed-demo-vc-atlas@crucible.test'),
      'email', 'b7777777-7777-4111-8111-777777777777', now(), now(), now()
    );
  END IF;
END $$;

UPDATE public.vc_profiles SET firm_name = 'Meridian Ventures', investment_thesis = 'B2B SaaS, GTM tooling, Seed–A.'
WHERE user_id = 'b4444444-4444-4111-8111-444444444444';

UPDATE public.vc_profiles SET firm_name = 'Coastline Capital', investment_thesis = 'Climate, edge ML, technical founders.'
WHERE user_id = 'b5555555-5555-4111-8111-555555555555';

UPDATE public.vc_profiles SET firm_name = 'Nimbus Partners', investment_thesis = 'Security & compliance infra; pre-seed focus.'
WHERE user_id = 'b6666666-6666-4111-8111-666666666666';

UPDATE public.vc_profiles SET firm_name = 'Atlas Growth', investment_thesis = 'Operator-led growth; Seed in US & EU.'
WHERE user_id = 'b7777777-7777-4111-8111-777777777777';

INSERT INTO public.project_vc_matches (
  id, project_id, vc_id, last_action, match_score, thesis_fit, stage_fit, sector_fit, team_score, sentiment_summary
)
VALUES
  (
    'f4c00001-0000-4000-8000-000000000001',
    'c1111111-1111-4111-8111-111111111111',
    'b4444444-4444-4111-8111-444444444444',
    'interested',
    89, 91, 86, 88, 87,
    '{"badges":["GTM clarity","Regulated markets"],"summary":"Strong narrative on enterprise motion."}'::jsonb
  ),
  (
    'f4c00002-0000-4000-8000-000000000002',
    'c1111111-1111-4111-8111-111111111111',
    'b5555555-5555-4111-8111-555555555555',
    'save',
    86, 84, 88, 85, 86,
    '{"badges":["Climate angle","Edge ML"],"summary":"Overlap with portfolio on carbon-aware routing."}'::jsonb
  ),
  (
    'f4c00003-0000-4000-8000-000000000003',
    'c1111111-1111-4111-8111-111111111111',
    'b6666666-6666-4111-8111-666666666666',
    'interested',
    92, 94, 90, 91, 90,
    '{"badges":["Compliance depth","Team cadence"],"summary":"Security story resonates; follow on diligence."}'::jsonb
  ),
  (
    'f4c00004-0000-4000-8000-000000000004',
    'c1111111-1111-4111-8111-111111111111',
    'b7777777-7777-4111-8111-777777777777',
    'pass',
    78, 80, 74, 79, 77,
    '{"badges":["Capital efficiency"],"summary":"Interesting but slightly early vs current mandate."}'::jsonb
  ),
  (
    'f4c00005-0000-4000-8000-000000000005',
    'c2222222-2222-4222-8222-222222222222',
    'b4444444-4444-4111-8111-444444444444',
    'save',
    87, 85, 89, 86, 88,
    '{"badges":["Technical depth"],"summary":"Edge ML thesis fit; wants cap table walkthrough."}'::jsonb
  ),
  (
    'f4c00006-0000-4000-8000-000000000006',
    'c2222222-2222-4222-8222-222222222222',
    'b5555555-5555-4111-8111-555555555555',
    'interested',
    93, 95, 91, 92, 91,
    '{"badges":["Climate fit","Hardware-aware"],"summary":"Top quartile for mandate; scheduling partner sync."}'::jsonb
  ),
  (
    'f4c00007-0000-4000-8000-000000000007',
    'c2222222-2222-4222-8222-222222222222',
    'b6666666-6666-4111-8111-666666666666',
    'interested',
    81, 82, 80, 79, 83,
    '{"badges":["Infrastructure POV"],"summary":"Security lens on edge deploys; open questions on GTM."}'::jsonb
  ),
  (
    'f4c00008-0000-4000-8000-000000000008',
    'c2222222-2222-4222-8222-222222222222',
    'b7777777-7777-4111-8111-777777777777',
    'save',
    85, 83, 87, 84, 86,
    '{"badges":["Operator empathy"],"summary":"Growth playbook alignment; wants second video on sales."}'::jsonb
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
