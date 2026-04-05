# Crucible — Next.js UI

Interactive mobile-first prototype for the Crucible flows (role selection, onboarding, Feed / Matches / Record / Inbox / Profile). Styling matches `Reference/crucible_onboarding (1).html`.

## Stack

- **Next.js** (App Router) — optimized for **Vercel** deployments. The framework uses **Turbopack** in development and its own production compiler (not Vite). If you specifically need a Vite-based SPA, say so and we can split a `vite` app; for Vercel + React, Next.js is the default path.
- **React 19**, **TypeScript**
- Plain **CSS** (design tokens in `app/globals.css`)

## Scripts

From the **`web/`** folder:

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

From the **repository root** (npm workspaces):

```bash
npm install
npm run dev      # runs the web app
npm run build
npm run lint
```

## Deploy on Vercel

The Next.js app is in **`web/`**. If Vercel builds the repo **root** without that folder as the app root, you will see **`404 NOT_FOUND`** on the deployment URL.

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com), **Import** the repository.
3. **Project → Settings → General → Root Directory** → set to **`web`** → **Save**.
4. **Build & Development Settings:** Framework **Next.js** (auto). Do **not** set a custom **Output Directory** for Next.js (leave default).
5. **Redeploy** (Deployments → ⋯ → Redeploy).

**If you still see 404:** confirm the latest deployment **Build** log shows `next build` succeeding and that **Root Directory** is `web`, not empty.

**Alternative (repo root deploy):** the repository root has a `package.json` with **npm workspaces** so `npm install` / `npm run build` from the root can build the `web` package. You can leave Root Directory as **`.`** only if the Vercel build uses those scripts and detects Next.js; the reliable option remains **Root Directory = `web`**.

Environment variables are not required for the static UI. For **Supabase** later, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

and initialize the client in a small `lib/supabase.ts` (see [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)).

## Project layout

- `app/layout.tsx` — fonts (Syne, DM Mono, Cormorant Garamond)
- `app/page.tsx` — entry
- `app/globals.css` — Crucible theme and layout
- `components/crucible/` — shell, onboarding, tab screens, video modal
