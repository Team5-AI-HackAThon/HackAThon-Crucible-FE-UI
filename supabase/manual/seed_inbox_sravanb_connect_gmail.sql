-- Inbox test data for sravanb.connect@gmail.com (Google sign-in).
--
-- BEFORE RUNNING: Sign in to Crucible once with that Google account so
-- auth.users + public.profiles exist for your UUID.
--
-- Run the whole file in Supabase → SQL Editor (postgres bypasses RLS).
-- Safe to re-run: idempotent inserts + policy refresh.

-- ---------------------------------------------------------------------------
-- A) Demo VC + demo founder (counterparties) — same as seed_inbox_only_counterparties.sql
-- ---------------------------------------------------------------------------
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
VALUES ('b3333333-3333-4333-8333-333333333333', 'Demo thesis — inbox counterpart.')
ON CONFLICT (user_id) DO UPDATE SET
  investment_thesis = COALESCE(nullif(trim(vc_profiles.investment_thesis), ''), EXCLUDED.investment_thesis);

-- ---------------------------------------------------------------------------
-- B) RLS: allow reading counterparty profile in shared conversations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_messaging_partners ON public.profiles;

CREATE POLICY profiles_select_messaging_partners ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.founder_id = auth.uid() OR c.vc_id = auth.uid())
        AND (c.founder_id = profiles.id OR c.vc_id = profiles.id)
    )
  );

-- ---------------------------------------------------------------------------
-- C) Thread for sravanb.connect@gmail.com (founder OR investor)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  my_email constant text := 'sravanb.connect@gmail.com';
  me uuid;
  my_role public.app_role;
  demo_vc uuid := 'b3333333-3333-4333-8333-333333333333';
  demo_founder uuid := 'a1111111-1111-4111-8111-111111111111';
  conv_id uuid;
  t0 timestamptz := now() - interval '40 minutes';
  t1 timestamptz := now() - interval '25 minutes';
  t2 timestamptz := now() - interval '3 minutes';
BEGIN
  SELECT id INTO me FROM auth.users WHERE lower(email) = lower(my_email) LIMIT 1;
  IF me IS NULL THEN
    RAISE EXCEPTION 'No auth user for %. Sign in to the app with Google once, then run this script again.', my_email;
  END IF;

  SELECT p.role INTO my_role FROM public.profiles p WHERE p.id = me;
  IF my_role IS NULL THEN
    RAISE EXCEPTION 'No public.profiles row for %. Finish sign-in / onboarding in the app first.', my_email;
  END IF;

  IF my_role = 'founder' THEN
    SELECT c.id INTO conv_id
    FROM public.conversations c
    WHERE c.founder_id = me AND c.vc_id = demo_vc AND c.project_id IS NULL
    LIMIT 1;

    IF conv_id IS NULL THEN
      conv_id := gen_random_uuid();
      INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
      VALUES (conv_id, me, demo_vc, NULL, t2, t0);
    END IF;

    INSERT INTO public.messages (id, conversation_id, sender_id, body, read_at, created_at)
    VALUES
      (
        '5d10a001-0000-4000-8000-000000000001',
        conv_id,
        demo_vc,
        'Hi Sravan — Jordan here (demo VC). Thanks for trying Crucible; this thread is seeded for your Gmail login.',
        t1,
        t0
      ),
      (
        '5d10a002-0000-4000-8000-000000000002',
        conv_id,
        me,
        'Thanks, Jordan — replying from my inbox to confirm the thread shows up.',
        NULL,
        t2
      )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.conversations
    SET
      last_message_at = t2,
      chat_json = jsonb_build_object(
        'schema_version', 1,
        'project_id', NULL,
        'messages', jsonb_build_array(
          jsonb_build_object(
            'id', '5d10a001-0000-4000-8000-000000000001',
            'sender_id', demo_vc::text,
            'sender_role', 'investor',
            'body', 'Hi Sravan — Jordan here (demo VC). Thanks for trying Crucible; this thread is seeded for your Gmail login.',
            'read_at', to_char(t1 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'created_at', to_char(t0 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ),
          jsonb_build_object(
            'id', '5d10a002-0000-4000-8000-000000000002',
            'sender_id', me::text,
            'sender_role', 'founder',
            'body', 'Thanks, Jordan — replying from my inbox to confirm the thread shows up.',
            'read_at', NULL,
            'created_at', to_char(t2 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        )
      )
    WHERE id = conv_id;

  ELSE
    -- investor: you are vc_id, demo Alex is founder_id
    SELECT c.id INTO conv_id
    FROM public.conversations c
    WHERE c.founder_id = demo_founder AND c.vc_id = me AND c.project_id IS NULL
    LIMIT 1;

    IF conv_id IS NULL THEN
      conv_id := gen_random_uuid();
      INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
      VALUES (conv_id, demo_founder, me, NULL, t2, t0);
    END IF;

    INSERT INTO public.messages (id, conversation_id, sender_id, body, read_at, created_at)
    VALUES
      (
        '5d10b001-0000-4000-8000-000000000001',
        conv_id,
        demo_founder,
        'Hi — Alex here (demo founder). Pinging you as Sravan on the investor side of this test thread.',
        t1,
        t0
      ),
      (
        '5d10b002-0000-4000-8000-000000000002',
        conv_id,
        me,
        'Got it — seeing this in my inbox under my Google account. Thanks!',
        NULL,
        t2
      )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.conversations
    SET
      last_message_at = t2,
      chat_json = jsonb_build_object(
        'schema_version', 1,
        'project_id', NULL,
        'messages', jsonb_build_array(
          jsonb_build_object(
            'id', '5d10b001-0000-4000-8000-000000000001',
            'sender_id', demo_founder::text,
            'sender_role', 'founder',
            'body', 'Hi — Alex here (demo founder). Pinging you as Sravan on the investor side of this test thread.',
            'read_at', to_char(t1 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'created_at', to_char(t0 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ),
          jsonb_build_object(
            'id', '5d10b002-0000-4000-8000-000000000002',
            'sender_id', me::text,
            'sender_role', 'investor',
            'body', 'Got it — seeing this in my inbox under my Google account. Thanks!',
            'read_at', NULL,
            'created_at', to_char(t2 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        )
      )
    WHERE id = conv_id;
  END IF;
END $$;
