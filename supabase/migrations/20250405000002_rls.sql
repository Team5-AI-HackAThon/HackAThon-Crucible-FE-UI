-- Row Level Security — tighten per authenticated user; service role bypasses RLS for APIs.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vc_capital_mgmt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vc_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

-- Lookup tables: read for any authenticated user (adjust if you need private taxonomies)
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

-- Idempotent: safe to re-run in SQL Editor after a partial apply
DROP POLICY IF EXISTS industries_select_authenticated ON public.industries;
DROP POLICY IF EXISTS project_stages_select_authenticated ON public.project_stages;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS founder_profiles_own ON public.founder_profiles;
DROP POLICY IF EXISTS vc_profiles_own ON public.vc_profiles;
DROP POLICY IF EXISTS vc_capital_own ON public.vc_capital_mgmt;
DROP POLICY IF EXISTS projects_select_own ON public.projects;
DROP POLICY IF EXISTS projects_insert_own ON public.projects;
DROP POLICY IF EXISTS projects_update_own ON public.projects;
DROP POLICY IF EXISTS projects_delete_own ON public.projects;
DROP POLICY IF EXISTS projects_select_vc_discovery ON public.projects;
DROP POLICY IF EXISTS project_industries_by_founder ON public.project_industries;
DROP POLICY IF EXISTS pvm_founder ON public.project_vc_matches;
DROP POLICY IF EXISTS pvm_vc_insert ON public.project_vc_matches;
DROP POLICY IF EXISTS pvm_vc_update ON public.project_vc_matches;
DROP POLICY IF EXISTS pvm_founder_update ON public.project_vc_matches;
DROP POLICY IF EXISTS connections_participants ON public.connections;
DROP POLICY IF EXISTS media_owner ON public.media_assets;
DROP POLICY IF EXISTS media_vc_read_published ON public.media_assets;
DROP POLICY IF EXISTS sentiment_read ON public.sentiment_outputs;
DROP POLICY IF EXISTS sentiment_service_insert ON public.sentiment_outputs;
DROP POLICY IF EXISTS conversations_participants ON public.conversations;
DROP POLICY IF EXISTS messages_participants ON public.messages;
DROP POLICY IF EXISTS feed_vc_read ON public.feed_items;
DROP POLICY IF EXISTS feed_founder_write ON public.feed_items;

CREATE POLICY industries_select_authenticated ON public.industries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY project_stages_select_authenticated ON public.project_stages
  FOR SELECT TO authenticated USING (true);

-- Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Founder / VC extension tables
CREATE POLICY founder_profiles_own ON public.founder_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY vc_profiles_own ON public.vc_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY vc_capital_own ON public.vc_capital_mgmt
  FOR ALL TO authenticated USING (auth.uid() = vc_id) WITH CHECK (auth.uid() = vc_id);

-- Projects (founder owns)
CREATE POLICY projects_select_own ON public.projects
  FOR SELECT TO authenticated USING (auth.uid() = founder_id);

CREATE POLICY projects_insert_own ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = founder_id);

CREATE POLICY projects_update_own ON public.projects
  FOR UPDATE TO authenticated USING (auth.uid() = founder_id);

CREATE POLICY projects_delete_own ON public.projects
  FOR DELETE TO authenticated USING (auth.uid() = founder_id);

-- VCs can read projects for discovery / matching (adjust to published-only if needed)
CREATE POLICY projects_select_vc_discovery ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

-- Project industries junction
CREATE POLICY project_industries_by_founder ON public.project_industries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id AND pr.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id AND pr.founder_id = auth.uid()
    )
  );

-- Matches: participants can read
CREATE POLICY pvm_founder ON public.project_vc_matches
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.founder_id = auth.uid())
    OR vc_id = auth.uid()
  );

CREATE POLICY pvm_vc_insert ON public.project_vc_matches
  FOR INSERT TO authenticated WITH CHECK (vc_id = auth.uid());

CREATE POLICY pvm_vc_update ON public.project_vc_matches
  FOR UPDATE TO authenticated USING (vc_id = auth.uid());

CREATE POLICY pvm_founder_update ON public.project_vc_matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.founder_id = auth.uid())
  );

-- Connections
CREATE POLICY connections_participants ON public.connections
  FOR ALL TO authenticated
  USING (founder_id = auth.uid() OR vc_id = auth.uid())
  WITH CHECK (founder_id = auth.uid() OR vc_id = auth.uid());

-- Media
CREATE POLICY media_owner ON public.media_assets
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY media_vc_read_published ON public.media_assets
  FOR SELECT TO authenticated
  USING (
    published_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'investor')
  );

-- Sentiment (via media ownership)
CREATE POLICY sentiment_read ON public.sentiment_outputs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets m
      WHERE m.id = media_asset_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY sentiment_service_insert ON public.sentiment_outputs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets m
      WHERE m.id = media_asset_id AND m.owner_id = auth.uid()
    )
  );

-- Conversations & messages
CREATE POLICY conversations_participants ON public.conversations
  FOR ALL TO authenticated
  USING (founder_id = auth.uid() OR vc_id = auth.uid())
  WITH CHECK (founder_id = auth.uid() OR vc_id = auth.uid());

CREATE POLICY messages_participants ON public.messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.founder_id = auth.uid() OR c.vc_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.founder_id = auth.uid() OR c.vc_id = auth.uid())
    )
  );

-- Feed items (read for investors; founders see own project items)
CREATE POLICY feed_vc_read ON public.feed_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'investor')
    OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id AND pr.founder_id = auth.uid()
    )
  );

CREATE POLICY feed_founder_write ON public.feed_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id AND pr.founder_id = auth.uid()
    )
  );
