# Supabase database (Crucible)

SQL migrations model the founder/investor flows, PRD data needs, and your preliminary ER sketch (`profiles`, `projects`, `connections`, `vc_capital_mgmt`, matches, messaging, media).

## Apply migrations

**Option A — Supabase Dashboard**

1. Open **SQL Editor** in your Supabase project.
2. Run each file in order:
   - `migrations/20250405000000_initial_schema.sql`
   - `migrations/20250405000001_seed_lookups.sql`
   - `migrations/20250405000002_rls.sql`
   - `migrations/20250405000003_auth_profile_hook.sql` (optional; creates `profiles` on `auth.users` insert)
   - `migrations/20250406120000_storage_crucible_media.sql` (**Record tab**: Storage bucket `crucible-media` + RLS policies)
   - `migrations/20250406140000_seed_feed_items.sql` (**Feed tab demo**: email/password users + `projects` + published `media_assets` + `feed_items`)
   - `migrations/20250406150000_feed_public_read_policies.sql` (**Feed**: any authenticated user can read `feed_items` and joined project/media rows on the feed)
   - `migrations/20250406160000_seed_inbox_conversations.sql` (**Inbox**: `profiles` RLS for messaging partners + demo `conversations` / `messages`; requires feed demo users)
   - `migrations/20250406170000_seed_remaining_tables_demo.sql` (extra demo data)
   - `migrations/20250406190000_conversations_chat_json.sql` (optional `conversations.chat_json` snapshot)
   - `migrations/20250406180000_feed_items_delete_owner.sql` (**Feed**: media owner may `DELETE` their `feed_items` row)
   - `migrations/20250406200000_storage_pitch_uploads_azure_read.sql` (**Python/Azure**: anon `SELECT` on `pitch_uploads/%` + bucket `public`; see `Reference/prompt-python-media-url-signed-urls.md` for signed-URL preference)
   - `migrations/20250406210000_storage_select_published_on_feed.sql` (**Feed tab video**: any signed-in user can `createSignedUrl` for objects tied to published `feed_items`)

### Feed demo seed (optional)

After **`20250406140000_seed_feed_items.sql`**, enable **Email** under Authentication → Providers (same password for all seeded accounts: **`DemoPassword123!`**), then sign in as:

| Account | Role | Notes |
|--------|------|--------|
| `feed-demo-founder1@crucible.test` | Founder | Two projects seeded |
| `feed-demo-founder2@crucible.test` | Founder | One project seeded |
| `feed-demo-vc@crucible.test` | Investor | — |

With **`20250406150000_feed_public_read_policies.sql`** applied, every signed-in user sees the **full** feed (not only investors or own projects).

The web app loads `feed_items` with joined `media_assets` and `projects` (RLS applies automatically). Google-only projects can ignore this migration and rely on real recordings instead.

**Option B — Supabase CLI** (from repo root, after `supabase link`)

```bash
supabase db push
```

## Auth (Gmail / Google SSO)

Configure **Authentication → Providers → Google** in the dashboard (Client ID / secret from Google Cloud Console). No DDL is required for OAuth itself.

To set **founder vs investor** before the user row exists, pass `role` in user metadata from the client (e.g. `data: { role: 'founder' }` on sign-in) so `handle_new_user` can pick it up. If you omit the optional trigger, create `profiles` (and `founder_profiles` / `vc_profiles`) from your API after the first Google sign-in.

## Storage (Record tab)

Run migration **`20250406120000_storage_crucible_media.sql`**, which creates bucket **`crucible-media`** (private), sets upload/read rules for `{auth.uid()}/…` paths, and lets investors read objects linked to **published** `media_assets`. The web app uploads WebM/MP4 and inserts rows into `media_assets` with matching `storage_path`.

## Backend APIs

Use the **service role** key only on the server; it bypasses RLS. Edge Functions or your API can run sentiment jobs, matching, and notifications without broadening client policies.

## Schema map (short)

| Area | Tables |
|------|--------|
| Identity | `profiles`, `founder_profiles`, `vc_profiles` |
| Onboarding / startup | `projects`, `project_industries`, `industries`, `project_stages` |
| Matching & pipeline | `project_vc_matches`, `connections` |
| Record / feed | `media_assets`, `sentiment_outputs`, `feed_items` |
| Inbox | `conversations`, `messages` |
| VC funds (optional) | `vc_capital_mgmt` |

Refine columns as your APIs solidify; migrations can be amended with follow-up files.
