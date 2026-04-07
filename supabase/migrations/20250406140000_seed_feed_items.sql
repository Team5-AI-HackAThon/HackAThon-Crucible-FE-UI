-- Demo feed: auth users + projects + published media + feed_items.
-- VCs can SELECT all feed_items; founders only rows for their projects (RLS).
-- Log in with email/password (email provider) — see supabase/README.md for accounts.
-- Idempotent: skips if demo emails already exist.

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

  -- Founder 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-founder1@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_instance,
      'a1111111-1111-4111-8111-111111111111',
      'authenticated',
      'authenticated',
      'feed-demo-founder1@crucible.test',
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"founder","full_name":"Alex Rivera"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'a1111111-1111-4111-8111-111111111111',
      jsonb_build_object(
        'sub', 'a1111111-1111-4111-8111-111111111111',
        'email', 'feed-demo-founder1@crucible.test'
      ),
      'email',
      'a1111111-1111-4111-8111-111111111111',
      now(),
      now(),
      now()
    );
  END IF;

  -- Founder 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-founder2@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_instance,
      'a2222222-2222-4222-8222-222222222222',
      'authenticated',
      'authenticated',
      'feed-demo-founder2@crucible.test',
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"founder","full_name":"Sam Okonkwo"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'a2222222-2222-4222-8222-222222222222',
      jsonb_build_object(
        'sub', 'a2222222-2222-4222-8222-222222222222',
        'email', 'feed-demo-founder2@crucible.test'
      ),
      'email',
      'a2222222-2222-4222-8222-222222222222',
      now(),
      now(),
      now()
    );
  END IF;

  -- Investor (VC feed reads all feed_items)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'feed-demo-vc@crucible.test') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_instance,
      'b3333333-3333-4333-8333-333333333333',
      'authenticated',
      'authenticated',
      'feed-demo-vc@crucible.test',
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Jordan Lee"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'b3333333-3333-4333-8333-333333333333',
      jsonb_build_object(
        'sub', 'b3333333-3333-4333-8333-333333333333',
        'email', 'feed-demo-vc@crucible.test'
      ),
      'email',
      'b3333333-3333-4333-8333-333333333333',
      now(),
      now(),
      now()
    );
  END IF;
END $$;

-- VC onboarding: non-empty thesis so app does not force investor onboarding on login
UPDATE public.vc_profiles
SET investment_thesis = 'Demo thesis for feed testing — pre-seed B2B SaaS and climate.'
WHERE user_id = 'b3333333-3333-4333-8333-333333333333';

-- Projects (two for founder 1, one for founder 2)
INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
VALUES
  (
    'c1111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-8111-111111111111',
    'Vanta AI',
    'San Francisco',
    'Behavioral intelligence for GTM teams in regulated industries.',
    '{"stage":"Seed","match_pct":94,"tags":["AI Infra","B2B","3-person team"]}'::jsonb
  ),
  (
    'c2222222-2222-4222-8222-222222222222',
    'a1111111-1111-4111-8111-111111111111',
    'Northwind Labs',
    'Austin',
    'Carbon-aware routing for edge ML workloads.',
    '{"stage":"Pre-Seed","match_pct":88,"tags":["Climate","Deep Tech"]}'::jsonb
  ),
  (
    'c3333333-3333-4333-8333-333333333333',
    'a2222222-2222-4222-8222-222222222222',
    'Helix Bio',
    'Boston',
    'Clinical trial ops copilot for mid-size biotech.',
    '{"stage":"Series A","match_pct":91,"tags":["Health Tech","B2B"]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Optional: link industries (ignore if missing)
INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'c1111111-1111-4111-8111-111111111111', id FROM public.industries WHERE slug = 'b2b-saas' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'c2222222-2222-4222-8222-222222222222', id FROM public.industries WHERE slug = 'climate' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.project_industries (project_id, industry_id)
SELECT 'c3333333-3333-4333-8333-333333333333', id FROM public.industries WHERE slug = 'health-tech' LIMIT 1
ON CONFLICT DO NOTHING;

-- Published media (paths under founder uid — storage objects may not exist; feed UI uses gradients)
INSERT INTO public.media_assets (
  id,
  owner_id,
  project_id,
  kind,
  storage_bucket,
  storage_path,
  duration_seconds,
  mime_type,
  published_at,
    quiz_template_slug,
    metadata
)
VALUES
  (
    'd1111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'video',
    'crucible-media',
    'a1111111-1111-4111-8111-111111111111/seed-demo-vanta.webm',
    167,
    'video/webm',
    now(),
    'fire_escape',
    '{"prompt_label":"Fire Escape · Dallas"}'::jsonb
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    'a1111111-1111-4111-8111-111111111111',
    'c2222222-2222-4222-8222-222222222222',
    'video',
    'crucible-media',
    'a1111111-1111-4111-8111-111111111111/seed-demo-northwind.webm',
    142,
    'video/webm',
    now(),
    'fire_escape',
    '{"prompt_label":"Fire Escape · Dallas"}'::jsonb
  ),
  (
    'd3333333-3333-4333-8333-333333333333',
    'a2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333',
    'video',
    'crucible-media',
    'a2222222-2222-4222-8222-222222222222/seed-demo-helix.webm',
    201,
    'video/webm',
    now(),
    'fire_escape',
    '{"prompt_label":"Fire Escape · Dallas"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.feed_items (id, media_asset_id, project_id, sort_key, live_scenario_tag)
VALUES
  (
    'e1111111-1111-4111-8111-111111111111',
    'd1111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    now() - interval '2 hours',
    '48th floor, Santander Building, Dallas. Floors 20–30 on fire.'
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222',
    'c2222222-2222-4222-8222-222222222222',
    now() - interval '5 hours',
    '48th floor, Santander Building, Dallas. Floors 20–30 on fire.'
  ),
  (
    'e3333333-3333-4333-8333-333333333333',
    'd3333333-3333-4333-8333-333333333333',
    'c3333333-3333-4333-8333-333333333333',
    now() - interval '1 day',
    '48th floor, Santander Building, Dallas. Floors 20–30 on fire.'
  )
ON CONFLICT (id) DO NOTHING;
