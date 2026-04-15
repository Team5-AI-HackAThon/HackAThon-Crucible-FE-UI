-- Feed playback: founders (and investors) need storage.objects SELECT to call createSignedUrl
-- for clips that are on the feed. Previously only investors had a published-media path policy;
-- paths like pitch_uploads/{id}/... and {uid}/... failed for founders viewing others' posts.

DROP POLICY IF EXISTS "crucible_media_select_published_on_feed" ON storage.objects;

CREATE POLICY "crucible_media_select_published_on_feed"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND EXISTS (
      SELECT 1
      FROM public.media_assets m
      INNER JOIN public.feed_items fi ON fi.media_asset_id = m.id
      WHERE m.storage_bucket = 'crucible-media'
        AND m.storage_path = name
        AND m.published_at IS NOT NULL
    )
  );
