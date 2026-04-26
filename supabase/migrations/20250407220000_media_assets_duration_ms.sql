ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS duration_ms integer NULL;

COMMENT ON COLUMN public.media_assets.duration_ms IS 'Media length in milliseconds; NULL if unknown.';
