-- Sidecar MP3 for video rows (extracted server-side / Python); same bucket as video, separate path.
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS audio_storage_path text,
  ADD COLUMN IF NOT EXISTS audio_mime_type text;

COMMENT ON COLUMN public.media_assets.audio_storage_path IS 'Storage object path for extracted audio (e.g. {userId}/{uuid}-audio.mp3), same bucket as storage_path.';
COMMENT ON COLUMN public.media_assets.audio_mime_type IS 'MIME type of extracted audio; typically audio/mpeg.';

-- Allow MP3 uploads into crucible-media (BFF uploads after Python returns audio).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'audio/mpeg',
  'audio/mp3'
]::text[]
WHERE id = 'crucible-media';
