-- Remove a feed post: only the uploader (media_assets.owner_id) may delete feed_items.

CREATE POLICY feed_items_delete_media_owner ON public.feed_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets m
      WHERE m.id = feed_items.media_asset_id
        AND m.owner_id = auth.uid()
    )
  );
