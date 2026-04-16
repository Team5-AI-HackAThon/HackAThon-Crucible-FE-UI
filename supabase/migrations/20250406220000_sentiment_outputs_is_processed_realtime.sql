-- Record tab AI button: poll + optional Realtime read `is_processed` on UPDATE.
-- Enable **Realtime** for table `sentiment_outputs` in Supabase Dashboard (Database → Publications)
-- if postgres_changes does not fire in the browser.

ALTER TABLE public.sentiment_outputs
  ADD COLUMN IF NOT EXISTS is_processed boolean NOT NULL DEFAULT false;

ALTER TABLE public.sentiment_outputs REPLICA IDENTITY FULL;
