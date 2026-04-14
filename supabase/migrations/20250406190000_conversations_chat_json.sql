-- Optional denormalized chat snapshot on conversations.chat_json.
-- Depends on demo users/projects from 20250406140000_seed_feed_items.sql and
-- conversation rows from 20250406160000_seed_inbox_conversations.sql (same UUIDs).
-- FK parents: founder_id / vc_id -> public.profiles(id); project_id -> public.projects(id).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS chat_json JSONB;

-- Thread 1: Alex (founder) ↔ Jordan (VC), project Vanta AI
UPDATE public.conversations
SET chat_json = $json$
{
  "schema_version": 1,
  "project_id": "c1111111-1111-4111-8111-111111111111",
  "messages": [
    {
      "id": "1d000001-0000-4000-8000-000000000001",
      "sender_id": "a1111111-1111-4111-8111-111111111111",
      "sender_role": "founder",
      "body": "Thanks for the interest in Vanta AI — happy to walk through the deck.",
      "read_at": "2026-04-04T17:05:00Z",
      "created_at": "2026-04-04T17:00:00Z"
    },
    {
      "id": "1d000002-0000-4000-8000-000000000002",
      "sender_id": "b3333333-3333-4333-8333-333333333333",
      "sender_role": "investor",
      "body": "Love the behavioral angle on GTM. Can we do 30 minutes Thursday?",
      "read_at": "2026-04-04T18:00:00Z",
      "created_at": "2026-04-04T17:45:00Z"
    },
    {
      "id": "1d000003-0000-4000-8000-000000000003",
      "sender_id": "a1111111-1111-4111-8111-111111111111",
      "sender_role": "founder",
      "body": "Thursday works — I'll send a calendar invite.",
      "read_at": null,
      "created_at": "2026-04-04T18:30:00Z"
    }
  ]
}
$json$::jsonb
WHERE id = '1c000001-0000-4000-8000-000000000001';

-- Thread 2: same pair, no project (Northwind / general)
UPDATE public.conversations
SET chat_json = $json$
{
  "schema_version": 1,
  "project_id": null,
  "messages": [
    {
      "id": "1d000004-0000-4000-8000-000000000004",
      "sender_id": "b3333333-3333-4333-8333-333333333333",
      "sender_role": "investor",
      "body": "Saw Northwind Labs in your profile — quick question on edge compute targets.",
      "read_at": "2026-04-03T13:00:00Z",
      "created_at": "2026-04-03T12:00:00Z"
    },
    {
      "id": "1d000005-0000-4000-8000-000000000005",
      "sender_id": "a1111111-1111-4111-8111-111111111111",
      "sender_role": "founder",
      "body": "We're piloting in three regions — happy to share the one-pager.",
      "read_at": null,
      "created_at": "2026-04-03T14:15:00Z"
    }
  ]
}
$json$::jsonb
WHERE id = '1c000002-0000-4000-8000-000000000002';

-- Thread 3: Sam (founder) ↔ Jordan (VC), Helix Bio
UPDATE public.conversations
SET chat_json = $json$
{
  "schema_version": 1,
  "project_id": "c3333333-3333-4333-8333-333333333333",
  "messages": [
    {
      "id": "1d000006-0000-4000-8000-000000000006",
      "sender_id": "a2222222-2222-4222-8222-222222222222",
      "sender_role": "founder",
      "body": "Helix Bio: trial ops timeline is tighter than we hoped — flagging early.",
      "read_at": "2026-04-01T17:00:00Z",
      "created_at": "2026-04-01T16:20:00Z"
    },
    {
      "id": "1d000007-0000-4000-8000-000000000007",
      "sender_id": "b3333333-3333-4333-8333-333333333333",
      "sender_role": "investor",
      "body": "Let's compare notes on CRO workflows next week.",
      "read_at": null,
      "created_at": "2026-04-02T09:45:00Z"
    }
  ]
}
$json$::jsonb
WHERE id = '1c000003-0000-4000-8000-000000000003';
