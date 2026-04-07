-- Inbox demo: conversations + messages between feed-demo founders and VC.
-- Requires profiles from `20250406140000_seed_feed_items.sql` (same UUIDs).
-- RLS: allow reading a profile when you share a conversation (for inbox names).

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

-- Founder1 (Alex) ↔ VC — thread tied to Vanta AI project
INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
VALUES (
  '1c000001-0000-4000-8000-000000000001',
  'a1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  'c1111111-1111-4111-8111-111111111111',
  '2026-04-04 18:30:00+00',
  '2026-04-04 17:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Founder1 ↔ VC — general (no project)
INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
VALUES (
  '1c000002-0000-4000-8000-000000000002',
  'a1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  NULL,
  '2026-04-03 14:15:00+00',
  '2026-04-03 12:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Founder2 (Sam) ↔ VC — Helix Bio project
INSERT INTO public.conversations (id, founder_id, vc_id, project_id, last_message_at, created_at)
VALUES (
  '1c000003-0000-4000-8000-000000000003',
  'a2222222-2222-4222-8222-222222222222',
  'b3333333-3333-4333-8333-333333333333',
  'c3333333-3333-4333-8333-333333333333',
  '2026-04-02 09:45:00+00',
  '2026-04-01 16:20:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Messages (conversation 1 — Vanta)
INSERT INTO public.messages (id, conversation_id, sender_id, body, read_at, created_at)
VALUES
  (
    '1d000001-0000-4000-8000-000000000001',
    '1c000001-0000-4000-8000-000000000001',
    'a1111111-1111-4111-8111-111111111111',
    'Thanks for the interest in Vanta AI — happy to walk through the deck.',
    '2026-04-04 17:05:00+00',
    '2026-04-04 17:00:00+00'
  ),
  (
    '1d000002-0000-4000-8000-000000000002',
    '1c000001-0000-4000-8000-000000000001',
    'b3333333-3333-4333-8333-333333333333',
    'Love the behavioral angle on GTM. Can we do 30 minutes Thursday?',
    '2026-04-04 18:00:00+00',
    '2026-04-04 17:45:00+00'
  ),
  (
    '1d000003-0000-4000-8000-000000000003',
    '1c000001-0000-4000-8000-000000000001',
    'a1111111-1111-4111-8111-111111111111',
    'Thursday works — I''ll send a calendar invite.',
    NULL,
    '2026-04-04 18:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Messages (conversation 2 — Northwind / general)
INSERT INTO public.messages (id, conversation_id, sender_id, body, read_at, created_at)
VALUES
  (
    '1d000004-0000-4000-8000-000000000004',
    '1c000002-0000-4000-8000-000000000002',
    'b3333333-3333-4333-8333-333333333333',
    'Saw Northwind Labs in your profile — quick question on edge compute targets.',
    '2026-04-03 13:00:00+00',
    '2026-04-03 12:00:00+00'
  ),
  (
    '1d000005-0000-4000-8000-000000000005',
    '1c000002-0000-4000-8000-000000000002',
    'a1111111-1111-4111-8111-111111111111',
    'We''re piloting in three regions — happy to share the one-pager.',
    NULL,
    '2026-04-03 14:15:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Messages (conversation 3 — Helix)
INSERT INTO public.messages (id, conversation_id, sender_id, body, read_at, created_at)
VALUES
  (
    '1d000006-0000-4000-8000-000000000006',
    '1c000003-0000-4000-8000-000000000003',
    'a2222222-2222-4222-8222-222222222222',
    'Helix Bio: trial ops timeline is tighter than we hoped — flagging early.',
    '2026-04-01 17:00:00+00',
    '2026-04-01 16:20:00+00'
  ),
  (
    '1d000007-0000-4000-8000-000000000007',
    '1c000003-0000-4000-8000-000000000003',
    'b3333333-3333-4333-8333-333333333333',
    'Let''s compare notes on CRO workflows next week.',
    NULL,
    '2026-04-02 09:45:00+00'
  )
ON CONFLICT (id) DO NOTHING;
