# Crucible — Next.js UI

Interactive mobile-first prototype for the Crucible flows (role selection, onboarding, Feed / Matches / Record / Inbox / Profile). Styling matches `Reference/crucible_onboarding (1).html`.

## Stack

- **Next.js** (App Router) — optimized for **Vercel** deployments. The framework uses **Turbopack** in development and its own production compiler (not Vite). If you specifically need a Vite-based SPA, say so and we can split a `vite` app; for Vercel + React, Next.js is the default path.
- **React 19**, **TypeScript**
- Plain **CSS** (design tokens in `app/globals.css`)

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

## Deploy on Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com), **Import** the repository.
3. Set **Root Directory** to `web` (this monorepo keeps the HTML reference at the repo root).
4. Framework preset: **Next.js** (auto-detected). Build: `npm run build`, Output: `.next`.
5. Deploy.

Environment variables are not required for the static UI. For **Supabase** later, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

and initialize the client in a small `lib/supabase.ts` (see [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)).

## Project layout

- `app/layout.tsx` — fonts (Syne, DM Mono, Cormorant Garamond)
- `app/page.tsx` — entry
- `app/globals.css` — Crucible theme and layout
- `components/crucible/` — shell, onboarding, tab screens, video modal
