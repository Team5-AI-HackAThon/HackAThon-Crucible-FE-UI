import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Remove a feed post: delete feed_items row (RLS: media owner only),
 * then clear published_at on the clip so it is no longer exposed to investors via storage policy.
 */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params;
    if (!itemId?.trim()) {
      return NextResponse.json({ error: "Missing feed item id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("feed_items")
      .select("id, media_asset_id")
      .eq("id", itemId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!row) {
      return NextResponse.json({ error: "Feed post not found" }, { status: 404 });
    }

    const mediaId = row.media_asset_id;

    const { error: delErr } = await supabase.from("feed_items").delete().eq("id", itemId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 403 });
    }

    const { error: upErr } = await supabase
      .from("media_assets")
      .update({ published_at: null })
      .eq("id", mediaId)
      .eq("owner_id", user.id);

    if (upErr) {
      console.warn("feed delete: unpublish media failed", upErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
