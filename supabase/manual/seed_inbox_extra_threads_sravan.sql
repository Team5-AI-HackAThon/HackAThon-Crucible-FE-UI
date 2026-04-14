-- Extra inbox threads for Sravan (or change sravan_id below).
-- Run in Supabase SQL Editor after seed_inbox_sravanb_connect_gmail.sql (or equivalent).
-- Uses: one additional demo VC + three projects you own + four new conversations (chat_json).
-- Idempotent on fixed UUIDs (ON CONFLICT DO NOTHING where applicable).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  sravan_id uuid := 'db9b7ee1-43dc-43c6-97bc-9779ce38926f';
  jordan_vc uuid := 'b3333333-3333-4333-8333-333333333333';
  -- Second demo VC (Taylor / Meridian Capital) for a second "general" thread
  taylor_vc uuid := 'e4444444-4444-4444-8444-444444444444';
  v_instance uuid;
  v_pw text := extensions.crypt('DemoPassword123!', extensions.gen_salt('bf'));

  p1 uuid := '7d700001-0000-4000-8000-000000000001';
  p2 uuid := '7d700002-0000-4000-8000-000000000002';
  p3 uuid := '7d700003-0000-4000-8000-000000000003';

  c_open uuid := '7e700001-0000-4000-8000-000000000001';
  c_p1 uuid := '7e700002-0000-4000-8000-000000000002';
  c_p2 uuid := '7e700003-0000-4000-8000-000000000003';
  c_p3 uuid := '7e700004-0000-4000-8000-000000000004';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = sravan_id) THEN
    RAISE EXCEPTION 'Profile % not found — sign in once or fix sravan_id in this script.', sravan_id;
  END IF;

  SELECT id INTO v_instance FROM auth.instances LIMIT 1;
  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Taylor VC: auth + profile (for extra NULL-project conversation)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = taylor_vc) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_instance, taylor_vc, 'authenticated', 'authenticated',
      'feed-demo-vc2@crucible.test', v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"investor","full_name":"Taylor Kim"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), taylor_vc,
      jsonb_build_object('sub', taylor_vc::text, 'email', 'feed-demo-vc2@crucible.test'),
      'email', taylor_vc::text, now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (taylor_vc, 'investor', 'Taylor Kim', 'feed-demo-vc2@crucible.test')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  INSERT INTO public.vc_profiles (user_id, investment_thesis)
  VALUES (taylor_vc, 'Demo thesis — secondary VC for multi-thread inbox.')
  ON CONFLICT (user_id) DO UPDATE SET
    investment_thesis = COALESCE(nullif(trim(vc_profiles.investment_thesis), ''), EXCLUDED.investment_thesis);

  -- Your projects (each enables one more Jordan thread with unique (founder, vc, project))
  INSERT INTO public.projects (id, founder_id, name, hq_city, one_line_pitch, metadata)
  VALUES
    (p1, sravan_id, 'Lumen Analytics', 'Seattle', 'Ops telemetry for regional manufacturers.', '{"tags":["B2B","Manufacturing"]}'::jsonb),
    (p2, sravan_id, 'Parcel Owl', 'Chicago', 'Last-mile carbon modeling for SMB shippers.', '{"tags":["Logistics","Climate"]}'::jsonb),
    (p3, sravan_id, 'Northstar Brief', 'Toronto', 'Exec briefing automation from scattered docs.', '{"tags":["AI","Productivity"]}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Open thread with Taylor (second inbox row without project)
  INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at, chat_json)
  VALUES (
    c_open,
    sravan_id,
    taylor_vc,
    NULL,
    '2026-04-12 20:00:00+00',
    '2026-04-12 18:00:00+00',
    jsonb_build_object(
      'schema_version', 1,
      'project_id', NULL,
      'messages', jsonb_build_array(
        jsonb_build_object(
          'id', '7f700001-0000-4000-8000-000000000001',
          'sender_id', taylor_vc::text,
          'sender_role', 'investor',
          'body', 'Sravan — Taylor at Meridian. Saw your note on manufacturing analytics; worth a 15-min intro?',
          'read_at', '2026-04-12T18:30:00Z',
          'created_at', '2026-04-12T18:00:00Z'
        ),
        jsonb_build_object(
          'id', '7f700002-0000-4000-8000-000000000002',
          'sender_id', sravan_id::text,
          'sender_role', 'founder',
          'body', 'Yes — Tuesday afternoon PT works on my side.',
          'read_at', NULL,
          'created_at', '2026-04-12T20:00:00Z'
        )
      )
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- Project-scoped threads with Jordan
  INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at, chat_json)
  VALUES (
    c_p1,
    sravan_id,
    jordan_vc,
    p1,
    '2026-04-11 16:00:00+00',
    '2026-04-11 14:00:00+00',
    jsonb_build_object(
      'schema_version', 1,
      'project_id', p1::text,
      'messages', jsonb_build_array(
        jsonb_build_object(
          'id', '7f701001-0000-4000-8000-000000000001',
          'sender_id', sravan_id::text,
          'sender_role', 'founder',
          'body', 'Jordan — sharing Lumen deck v3 under NDA. Focus is shop-floor signal latency.',
          'read_at', '2026-04-11T14:20:00Z',
          'created_at', '2026-04-11T14:00:00Z'
        ),
        jsonb_build_object(
          'id', '7f701002-0000-4000-8000-000000000002',
          'sender_id', jordan_vc::text,
          'sender_role', 'investor',
          'body', 'Received. Pilot metrics slide is strong — can we dig into gross margin on slide 8?',
          'read_at', NULL,
          'created_at', '2026-04-11T16:00:00Z'
        )
      )
    )
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at, chat_json)
  VALUES (
    c_p2,
    sravan_id,
    jordan_vc,
    p2,
    '2026-04-10 11:30:00+00',
    '2026-04-10 09:00:00+00',
    jsonb_build_object(
      'schema_version', 1,
      'project_id', p2::text,
      'messages', jsonb_build_array(
        jsonb_build_object(
          'id', '7f702001-0000-4000-8000-000000000001',
          'sender_id', jordan_vc::text,
          'sender_role', 'investor',
          'body', 'Parcel Owl fits our climate + logistics thesis. Who is your design partner today?',
          'read_at', '2026-04-10T10:00:00Z',
          'created_at', '2026-04-10T09:00:00Z'
        ),
        jsonb_build_object(
          'id', '7f702002-0000-4000-8000-000000000002',
          'sender_id', sravan_id::text,
          'sender_role', 'founder',
          'body', 'We are piloting with two regional 3PLs — can share anonymized routes next week.',
          'read_at', NULL,
          'created_at', '2026-04-10T11:30:00Z'
        )
      )
    )
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at, chat_json)
  VALUES (
    c_p3,
    sravan_id,
    jordan_vc,
    p3,
    '2026-04-09 22:15:00+00',
    '2026-04-09 20:00:00+00',
    jsonb_build_object(
      'schema_version', 1,
      'project_id', p3::text,
      'messages', jsonb_build_array(
        jsonb_build_object(
          'id', '7f703001-0000-4000-8000-000000000001',
          'sender_id', sravan_id::text,
          'sender_role', 'founder',
          'body', 'Northstar Brief: pushing weekly digest to 40 exec teams — want feedback on pricing.',
          'read_at', '2026-04-09T21:00:00Z',
          'created_at', '2026-04-09T20:00:00Z'
        ),
        jsonb_build_object(
          'id', '7f703002-0000-4000-8000-000000000002',
          'sender_id', jordan_vc::text,
          'sender_role', 'investor',
          'body', 'Pricing feels conservative vs. value — happy to jam on packaging Friday.',
          'read_at', NULL,
          'created_at', '2026-04-09T22:15:00Z'
        )
      )
    )
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
