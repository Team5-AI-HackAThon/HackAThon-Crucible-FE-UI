-- Azure Video Indexer fetches media_url over anonymous HTTP GET.
-- Python submit-async stores files under pitch_uploads/{media_asset_id}/...
-- This bucket was private (public = false) with paths like {auth.uid()}/... for Record tab;
-- those paths stay protected: only anon SELECT below matches pitch_uploads/% .
--
-- Preferred long-term: Python should set media_url to a long-lived signed URL instead of
-- /object/public/... (then you can revert public = false and drop the anon policy).
-- See repo file Reference/prompt-python-media-url-signed-urls.md (Python: prefer signed URLs).

UPDATE storage.buckets
SET public = true
WHERE id = 'crucible-media';

DROP POLICY IF EXISTS "crucible_media_select_pitch_uploads_anon" ON storage.objects;
DROP POLICY IF EXISTS "crucible_media_select_pitch_uploads_owner" ON storage.objects;

-- Anonymous read ONLY for backend pipeline objects (Azure, curl tests without auth).
CREATE POLICY "crucible_media_select_pitch_uploads_anon"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'crucible-media'
    AND name LIKE 'pitch_uploads/%'
  );

-- Logged-in owner can read their own pitch_uploads object (signed-in app playback).
CREATE POLICY "crucible_media_select_pitch_uploads_owner"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND name LIKE 'pitch_uploads/%'
    AND EXISTS (
      SELECT 1 FROM public.media_assets m
      WHERE m.storage_bucket = 'crucible-media'
        AND m.storage_path = name
        AND m.owner_id = auth.uid()
    )
  );
