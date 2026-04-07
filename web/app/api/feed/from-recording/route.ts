import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let feedItemId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      mediaAssetId?: string;
      projectId?: string;
      liveScenarioTag?: string | null;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mediaAssetId = String(body.mediaAssetId ?? "").trim();
    const projectId = String(body.projectId ?? "").trim();
    const liveScenarioTag =
      body.liveScenarioTag != null && String(body.liveScenarioTag).trim() !== ""
        ? String(body.liveScenarioTag).trim().slice(0, 500)
        : null;

    if (!mediaAssetId || !projectId) {
      return NextResponse.json({ error: "mediaAssetId and projectId are required" }, { status: 400 });
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (profile?.role !== "founder") {
      return NextResponse.json({ error: "Only founders can publish to the feed" }, { status: 403 });
    }

    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, founder_id")
      .eq("id", projectId)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!proj || proj.founder_id !== user.id) {
      return NextResponse.json({ error: "Invalid project" }, { status: 403 });
    }

    const { data: asset, error: aErr } = await supabase
      .from("media_assets")
      .select("id, owner_id, kind")
      .eq("id", mediaAssetId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!asset || asset.owner_id !== user.id) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }
    if (asset.kind !== "video") {
      return NextResponse.json({ error: "Only video recordings can be added to the feed" }, { status: 400 });
    }

    const { data: existingFeed } = await supabase
      .from("feed_items")
      .select("id")
      .eq("media_asset_id", mediaAssetId)
      .maybeSingle();

    if (existingFeed) {
      return NextResponse.json({ ok: true, mediaId: mediaAssetId, alreadyOnFeed: true });
    }

    const now = new Date().toISOString();

    const { data: inserted, error: fErr } = await supabase
      .from("feed_items")
      .insert({
        media_asset_id: mediaAssetId,
        project_id: projectId,
        sort_key: now,
        live_scenario_tag: liveScenarioTag,
      })
      .select("id")
      .single();

    if (fErr) throw fErr;
    feedItemId = inserted.id;

    const { error: upErr } = await supabase
      .from("media_assets")
      .update({
        project_id: projectId,
        published_at: now,
      })
      .eq("id", mediaAssetId)
      .eq("owner_id", user.id);

    if (upErr) {
      await supabase.from("feed_items").delete().eq("id", feedItemId);
      feedItemId = null;
      throw upErr;
    }

    return NextResponse.json({ ok: true, mediaId: mediaAssetId, feedItemId: inserted.id });
  } catch (e: unknown) {
    if (feedItemId) {
      const supabase = await createClient();
      await supabase.from("feed_items").delete().eq("id", feedItemId);
    }
    const msg = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
