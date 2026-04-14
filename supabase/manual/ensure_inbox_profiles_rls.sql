-- Run in Supabase SQL Editor if inbox loads empty names or threads disappear after fetching profiles.
-- Default RLS only allows SELECT on your own profile; inbox needs to read the other participant.
-- (Same policy as migrations/20250406160000_seed_inbox_conversations.sql.)

DROP POLICY IF EXISTS profiles_select_messaging_partners ON public.profiles;

CREATE POLICY profiles_select_messaging_partners ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.founder_id = auth.uid() OR c.vc_id = auth.uid())
        AND (c.founder_id = profiles.id OR c.vc_id = profiles.id)
    )
  );
