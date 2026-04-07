import { createClient } from "@/lib/supabase/server";
import { downloadVideoForFeedImport } from "@/lib/server/feedVideoImport";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 120_000;

function validatePublicUrl(urlStr: string): { ok: true; url: URL } | { ok: false; message: string } {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return { ok: false, message: "Invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, message: "Only http(s) URLs are allowed" };
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return { ok: false, message: "That host is not allowed" };
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) {
    return { ok: false, message: "That host is not allowed" };
  }
  return { ok: true, url: u };
}

async function rollback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null,
  mediaId: string | null,
) {
  if (mediaId) {
    await supabase.from("media_assets").delete().eq("id", mediaId);
  }
  if (storagePath) {
    await supabase.storage.from("crucible-media").remove([storagePath]);
  }
}

export async function POST(req: Request) {
  let storagePath: string | null = null;
  let mediaId: string | null = null;

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
      videoUrl?: string;
      projectId?: string;
      liveScenarioTag?: string | null;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const videoUrl = String(body.videoUrl ?? "").trim();
    const projectId = String(body.projectId ?? "").trim();
    const liveScenarioTag =
      body.liveScenarioTag != null && String(body.liveScenarioTag).trim() !== ""
        ? String(body.liveScenarioTag).trim().slice(0, 500)
        : null;

    if (!videoUrl || !projectId) {
      return NextResponse.json({ error: "videoUrl and projectId are required" }, { status: 400 });
    }

    const urlCheck = validatePublicUrl(videoUrl);
    if (!urlCheck.ok) {
      return NextResponse.json({ error: urlCheck.message }, { status: 400 });
    }
    const publicUrl = urlCheck.url;

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let downloaded: Awaited<ReturnType<typeof downloadVideoForFeedImport>>;
    try {
      downloaded = await downloadVideoForFeedImport(videoUrl, publicUrl, controller.signal);
    } finally {
      clearTimeout(timer);
    }

    const { buf, contentType, ext, youtubeVideoId } = downloaded;

    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    storagePath = path;

    const { error: upErr } = await supabase.storage.from("crucible-media").upload(path, buf, {
      contentType: contentType?.split(";")[0]?.trim() || `video/${ext === "webm" ? "webm" : "mp4"}`,
      upsert: false,
    });
    if (upErr) throw upErr;

    const metadata: Record<string, unknown> = {
      source: youtubeVideoId ? "feed_youtube_import" : "feed_url_import",
    };
    if (youtubeVideoId) metadata.youtube_video_id = youtubeVideoId;

    const { data: media, error: mErr } = await supabase
      .from("media_assets")
      .insert({
        owner_id: user.id,
        project_id: projectId,
        kind: "video",
        storage_bucket: "crucible-media",
        storage_path: path,
        duration_seconds: null,
        mime_type: contentType?.split(";")[0]?.trim() ?? null,
        published_at: new Date().toISOString(),
        quiz_template_slug: null,
        metadata,
      })
      .select("id")
      .single();

    if (mErr) throw mErr;
    mediaId = media.id;

    const { error: fErr } = await supabase.from("feed_items").insert({
      media_asset_id: media.id,
      project_id: projectId,
      sort_key: new Date().toISOString(),
      live_scenario_tag: liveScenarioTag,
    });

    if (fErr) throw fErr;

    return NextResponse.json({ ok: true, mediaId: media.id });
  } catch (e: unknown) {
    const supabase = await createClient();
    await rollback(supabase, storagePath, mediaId);
    const aborted = e instanceof Error && e.name === "AbortError";
    if (aborted) {
      return NextResponse.json({ error: "Download timed out" }, { status: 408 });
    }
    const msg = e instanceof Error ? e.message : "Import failed";
    const clientError =
      /Video is too large|not a raw|No single-file|Could not read this YouTube|Could not download from YouTube CDN|Could not download video \(HTTP|region-blocked|split audio|direct \.mp4|yt-dlp/i.test(
        msg,
      );
    return NextResponse.json({ error: msg }, { status: clientError ? 400 : 500 });
  }
}
