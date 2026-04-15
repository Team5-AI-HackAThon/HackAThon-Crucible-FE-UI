# Prompt for Python backend (Crucible Video Intelligence)

Copy everything below the line into your Python/Cursor chat for the **hackathon-crucible-be** project.

---

## Task

Fix **`URL_UNREACHABLE`** from Azure Video Indexer when processing `sentiment_outputs` after `POST /api/v1/sentiment/video/submit-async`.

Today `media_url` is likely built as a **Supabase public** URL:

`https://<project>.supabase.co/storage/v1/object/public/crucible-media/pitch_uploads/...`

That fails when the bucket is **private** or when **anon** cannot `SELECT` those objects.

## Preferred solution (production-safe)

1. After uploading the file to Storage at `storage_path` in bucket `crucible-media`, set **`media_url`** to a **signed URL** from the Supabase **service role** client (not the anon key), with a **long TTL** (e.g. 24–168 hours) so Azure can finish indexing. Read TTL from env, e.g. `SUPABASE_SIGNED_URL_TTL_SEC` (default 604800 or similar).

2. Gate this with env, e.g. `SUPABASE_MEDIA_USE_SIGNED_URL=true`. When true, use `create_signed_url` / storage SDK equivalent for `(bucket, path)` and persist the full HTTPS URL (including query params) in `sentiment_outputs.media_url` (and anywhere else Azure reads).

3. When false, keep current public URL behavior **only if** the Supabase bucket is public and RLS allows anon `SELECT` on those paths (document that dependency).

4. Do **not** log the full signed URL in production logs (secrets in query string).

5. Add a short note in README: Azure must be able to **GET** `media_url` without extra headers; signed URLs satisfy this for private buckets.

## Optional checks

- Confirm `storage_path` written to `media_assets` matches the object key used for signing.
- After change, `curl -I "<media_url>"` from a machine with no cookies should return **200** before kicking off Video Indexer.

## Context from FE

- Next.js proxies upload to `submit-async`; polling shows Azure errors returned in status JSON (`job_error` / similar).
- Supabase FE migration may add **anon `SELECT`** only for `pitch_uploads/%` as a stopgap; signed URLs are still the better default.

---
