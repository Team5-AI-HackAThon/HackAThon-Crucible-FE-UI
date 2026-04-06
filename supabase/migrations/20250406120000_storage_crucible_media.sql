-- Supabase Storage bucket for Record tab video uploads (see media_assets.storage_bucket default).
-- Run via `supabase db push` / migration, or paste into SQL Editor if not using CLI.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crucible-media',
  'crucible-media',
  false,
  524288000,
  ARRAY['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path convention: {auth.uid()}/{uuid}.{ext}

CREATE POLICY "crucible_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crucible-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "crucible_media_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "crucible_media_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "crucible_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- VCs can read published videos (path must match media_assets.storage_path)
CREATE POLICY "crucible_media_select_published_for_investors"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crucible-media'
    AND EXISTS (
      SELECT 1
      FROM public.media_assets m
      WHERE m.storage_bucket = 'crucible-media'
        AND m.storage_path = objects.name
        AND m.published_at IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'investor'
        )
    )
  );
