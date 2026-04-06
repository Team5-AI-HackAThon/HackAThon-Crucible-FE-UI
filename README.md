# HackAThon-Crucible-FE-UI

## Crucible web app (Next.js)

The interactive UI lives in **`web/`** (Next.js 16, React 19). See [`web/README.md`](web/README.md) for install, dev, and **Vercel** deploy steps.

**Vercel:** set the project **Root Directory** to **`web`** (Settings → General). Building the repo root without that setting often yields **404 NOT_FOUND** on the deployment URL.

The original single-file reference remains at `Reference/crucible_onboarding (1).html`.

## Database (Supabase)

DDL migrations live under [`supabase/migrations/`](supabase/migrations/). See [`supabase/README.md`](supabase/README.md) for apply order, Google SSO notes, and storage.