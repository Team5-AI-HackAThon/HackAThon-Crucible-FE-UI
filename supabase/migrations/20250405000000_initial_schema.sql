-- Crucible — core schema (Founder/VC marketplace)
-- Run in Supabase SQL Editor or via `supabase db push` after linking a project.
-- Auth: use Supabase Auth + Google provider; profiles.id = auth.users.id

-- ---------------------------------------------------------------------------
-- Extensions (optional; gen_random_uuid() is built-in on Postgres 13+)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('founder', 'investor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_kind AS ENUM ('video', 'audio', 'image');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.interest_action AS ENUM ('interested', 'pass', 'save');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.connection_status AS ENUM (
    'requested',
    'pending',
    'accepted',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Lookup: industries (Screen 2 — multi-select in app; store as junction or array)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Lookup: project funding / lifecycle stage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Profiles — one row per auth user; role drives founder vs investor UX
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_lowercase CHECK (email IS NULL OR email = lower(email))
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- Founder-specific profile (optional extended fields)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  bio TEXT,
  filtering_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- VC-specific profile (thesis, filters, firm)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vc_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  firm_name TEXT,
  investment_thesis TEXT,
  intro_video_storage_path TEXT,
  interested_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  filtering_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  vc_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- VC capital / fund tracking (from preliminary model — optional MVP fields)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vc_capital_mgmt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  initial_capital_fund NUMERIC,
  fund_balance NUMERIC,
  fund_invested NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vc_capital_vc ON public.vc_capital_mgmt (vc_id);

-- ---------------------------------------------------------------------------
-- Projects / startups (Founder flow: name, HQ, industry, pitch, stage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hq_city TEXT,
  one_line_pitch TEXT,
  stage_id UUID REFERENCES public.project_stages (id),
  success_metrics JSONB DEFAULT '{}'::jsonb,
  budget_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_founder ON public.projects (founder_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects (stage_id);

-- Many industries per project (Screen 2 moved industry here)
CREATE TABLE IF NOT EXISTS public.project_industries (
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.industries (id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, industry_id)
);

-- ---------------------------------------------------------------------------
-- Match / interest between a project and a VC (Matches tab, feed actions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_vc_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  vc_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_action public.interest_action,
  match_score NUMERIC,
  thesis_fit NUMERIC,
  stage_fit NUMERIC,
  sector_fit NUMERIC,
  team_score NUMERIC,
  sentiment_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, vc_id)
);

CREATE INDEX IF NOT EXISTS idx_pvm_vc ON public.project_vc_matches (vc_id);
CREATE INDEX IF NOT EXISTS idx_pvm_project ON public.project_vc_matches (project_id);

-- ---------------------------------------------------------------------------
-- Connection pipeline (requested / pending / accepted)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  vc_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
  status public.connection_status NOT NULL DEFAULT 'requested',
  request_from_role public.app_role NOT NULL,
  requested_by UUID REFERENCES public.profiles (id),
  accepted_by UUID REFERENCES public.profiles (id),
  pending_with UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connections_founder ON public.connections (founder_id);
CREATE INDEX IF NOT EXISTS idx_connections_vc ON public.connections (vc_id);

CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_open
  ON public.connections (founder_id, vc_id)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_project
  ON public.connections (founder_id, vc_id, project_id)
  WHERE project_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Media — Record tab: video, audio, image; publish to feed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
  kind public.media_kind NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'crucible-media',
  storage_path TEXT NOT NULL,
  duration_seconds INT,
  mime_type TEXT,
  thumbnail_path TEXT,
  published_at TIMESTAMPTZ,
  quiz_template_slug TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_owner ON public.media_assets (owner_id);
CREATE INDEX IF NOT EXISTS idx_media_project ON public.media_assets (project_id);
CREATE INDEX IF NOT EXISTS idx_media_published ON public.media_assets (published_at);

-- ---------------------------------------------------------------------------
-- Sentiment / quiz outputs (MVP tags: communication, leadership, energy, …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sentiment_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_media ON public.sentiment_outputs (media_asset_id);

-- ---------------------------------------------------------------------------
-- Messaging — Inbox (realtime-friendly; use Supabase Realtime on messages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  vc_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_founder ON public.conversations (founder_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vc ON public.conversations (vc_id);

-- One thread per founder–VC pair when not tied to a project
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_open
  ON public.conversations (founder_id, vc_id)
  WHERE project_id IS NULL;

-- At most one thread per founder–VC–project when project is set
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_project
  ON public.conversations (founder_id, vc_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Feed surfacing — optional link of published media to feed ordering
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES public.media_assets (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  sort_key TIMESTAMPTZ NOT NULL DEFAULT now(),
  live_scenario_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_sort ON public.feed_items (sort_key DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_founder_profiles_updated BEFORE UPDATE ON public.founder_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_vc_profiles_updated BEFORE UPDATE ON public.vc_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_vc_capital_updated BEFORE UPDATE ON public.vc_capital_mgmt
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_pvm_updated BEFORE UPDATE ON public.project_vc_matches
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_connections_updated BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_media_updated BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Bump conversation last_message_at via API or trigger on insert (optional trigger left to app)

COMMENT ON TABLE public.profiles IS 'One row per Supabase auth user; role founder|investor.';
COMMENT ON TABLE public.projects IS 'Startup / project; founder onboarding: name, hq, industries, pitch.';
COMMENT ON TABLE public.media_assets IS 'Record tab assets; set published_at when posted to feed.';
COMMENT ON TABLE public.messages IS 'Inbox; enable Realtime replication for chat.';
