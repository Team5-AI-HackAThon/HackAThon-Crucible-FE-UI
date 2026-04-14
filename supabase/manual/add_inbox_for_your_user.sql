-- Fix empty inbox for YOUR login (e.g. Google). Seeded threads only match feed-demo-*@crucible.test UUIDs.
--
-- Before running:
--   1. Sign in to Crucible once with your real account (creates auth.users + profiles).
--   2. Run migration 20250406140000_seed_feed_items.sql so demo VC profile exists
--      (id b3333333-3333-4333-8333-333333333333).
--
-- Replace YOUR_EMAIL below with the email you use in the app.

DO $$
DECLARE
  me uuid;
  demo_vc uuid := 'b3333333-3333-4333-8333-333333333333';
  conv_id uuid;
BEGIN
  SELECT id INTO me FROM auth.users WHERE lower(email) = lower('YOUR_EMAIL@example.com') LIMIT 1;
  IF me IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for that email — sign in to the app once, then re-run.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = demo_vc) THEN
    RAISE EXCEPTION 'Demo VC profile missing — run 20250406140000_seed_feed_items.sql first.';
  END IF;

  SELECT id INTO conv_id FROM public.conversations
  WHERE founder_id = me AND vc_id = demo_vc AND project_id IS NULL
  LIMIT 1;

  IF conv_id IS NULL THEN
    conv_id := gen_random_uuid();
    INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
    VALUES (conv_id, me, demo_vc, NULL, now(), now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.messages WHERE conversation_id = conv_id
  ) THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, read_at, created_at)
    VALUES (
      conv_id,
      demo_vc,
      'Hi — this is a test thread linked to your account. Open Inbox again.',
      NULL,
      now()
    );
  END IF;

  UPDATE public.conversations
  SET
    last_message_at = now(),
    chat_json = jsonb_build_object(
      'schema_version', 1,
      'project_id', NULL,
      'messages', jsonb_build_array(
        jsonb_build_object(
          'sender_id', demo_vc::text,
          'sender_role', 'investor',
          'body', 'Hi — this is a test thread linked to your account. Open Inbox again.',
          'read_at', NULL,
          'created_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      )
    )
  WHERE id = conv_id;
END $$;

-- If YOUR account is the investor (VC), swap roles in the INSERT above:
--   founder_id := demo_vc (or another demo founder UUID),
--   vc_id := me,
-- and point sender_id in messages at the founder for the sample line.
