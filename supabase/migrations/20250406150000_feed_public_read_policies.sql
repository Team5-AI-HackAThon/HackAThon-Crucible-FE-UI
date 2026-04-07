-- Let any signed-in user read the feed (founders + investors), not only VCs / own projects.
-- Nested PostgREST selects require SELECT on feed_items, projects, and media_assets.

DROP POLICY IF EXISTS feed_vc_read ON public.feed_items;

CREATE POLICY feed_items_select_authenticated ON public.feed_items
  FOR SELECT TO authenticated
  USING (true);

-- Projects that appear on the feed (so non-owners can resolve joined rows)
CREATE POLICY projects_select_on_feed ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_items fi
      WHERE fi.project_id = projects.id
    )
  );

-- Published clips that are surfaced on the feed
CREATE POLICY media_select_published_on_feed ON public.media_assets
  FOR SELECT TO authenticated
  USING (
    published_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.feed_items fi
      WHERE fi.media_asset_id = media_assets.id
    )
  );
