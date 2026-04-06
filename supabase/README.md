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

**Option B — Supabase CLI** (from repo root, after `supabase link`)

```bash
supabase db push
```

## Auth (Gmail / Google SSO)

Configure **Authentication → Providers → Google** in the dashboard (Client ID / secret from Google Cloud Console). No DDL is required for OAuth itself.

To set **founder vs investor** before the user row exists, pass `role` in user metadata from the client (e.g. `data: { role: 'founder' }` on sign-in) so `handle_new_user` can pick it up. If you omit the optional trigger, create `profiles` (and `founder_profiles` / `vc_profiles`) from your API after the first Google sign-in.

## Storage (Record tab)

Create a bucket (e.g. **`crucible-media`**) and policies so founders can upload to their prefix; store `storage_bucket` + `storage_path` in `media_assets`. Details are intentionally left to your API layer.

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
