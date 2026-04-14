-- Minimal data for "Create sample thread" / ensure-demo-thread API (same login as Google).
-- Only creates demo founder + demo VC (no projects, media, or feed_items).
-- Run in Supabase SQL Editor once. Idempotent.
-- Password for email login (optional): DemoPassword123!
--
-- Requires: initial schema migrations (profiles, auth FK) already applied.

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

  -- Demo founder (Alex) — used as counterparty when YOU are an investor
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'a1111111-1111-4111-8111-111111111111') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
      'feed-demo-founder1@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"founder","full_name":"Alex Rivera"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 'a1111111-1111-4111-8111-111111111111',
      jsonb_build_object('sub', 'a1111111-1111-4111-8111-111111111111', 'email', 'feed-demo-founder1@crucible.test'),
      'email', 'a1111111-1111-4111-8111-111111111111', now(), now(), now()
    );
  END IF;

  -- Demo VC (Jordan) — used as counterparty when YOU are a founder
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b3333333-3333-4333-8333-333333333333') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, 'b3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
      'feed-demo-vc@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Jordan Lee"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 'b3333333-3333-4333-8333-333333333333',
      jsonb_build_object('sub', 'b3333333-3333-4333-8333-333333333333', 'email', 'feed-demo-vc@crucible.test'),
      'email', 'b3333333-3333-4333-8333-333333333333', now(), now(), now()
    );
  END IF;
END $$;

-- Ensure public.profiles + role tables (covers SQL Editor runs without trigger firing again)
INSERT INTO public.profiles (id, role, full_name, email)
VALUES
  ('a1111111-1111-4111-8111-111111111111', 'founder', 'Alex Rivera', 'feed-demo-founder1@crucible.test'),
  ('b3333333-3333-4333-8333-333333333333', 'investor', 'Jordan Lee', 'feed-demo-vc@crucible.test')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

INSERT INTO public.founder_profiles (user_id) VALUES ('a1111111-1111-4111-8111-111111111111')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.vc_profiles (user_id, investment_thesis)
VALUES ('b3333333-3333-4333-8333-333333333333', 'Demo thesis — inbox counterpart only.')
ON CONFLICT (user_id) DO UPDATE SET
  investment_thesis = COALESCE(nullif(trim(vc_profiles.investment_thesis), ''), EXCLUDED.investment_thesis);
