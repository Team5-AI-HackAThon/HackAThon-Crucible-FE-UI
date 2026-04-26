-- Parallel Record-tab audio (MediaRecorder) uploads: allow WebM / Ogg audio in crucible-media.
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'video/x-matroska',
    'audio/mpeg',
    'audio/mp3',
    'audio/webm',
    'audio/ogg'
  ]::text[]
WHERE id = 'crucible-media';
