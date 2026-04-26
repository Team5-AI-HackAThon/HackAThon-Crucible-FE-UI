import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "crucible-media";
const MAX_BYTES = 120 * 1024 * 1024;

function parseDurationMs(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.floor(n), 24 * 60 * 60 * 1000);
}

function siblingParallelAudioStoragePath(videoStoragePath: string): string {
  const normalized = videoStoragePath.trim().replace(/^\/+/, "");
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash) : "";
  const file = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const dot = file.lastIndexOf(".");
  const base = dot > 0 ? file.slice(0, dot) : file;
  const name = `${base}-parallel-audio.webm`;
  return dir ? `${dir}/${name}` : name;
}

/**
 * `crucible_media_insert_own` requires `split_part(name, '/', 1) = auth.uid()`.
 * Python (or other) uploads may use a path whose first segment is not the owner UUID — in that case
 * store parallel audio under `{ownerId}/{videoAssetId}-parallel-audio.webm` so RLS passes.
 */
function parallelAudioObjectPath(ownerId: string, videoStoragePath: string, videoAssetId: string): string {
  const normalized = videoStoragePath.trim().replace(/^\/+/, "");
  const firstSeg = normalized.includes("/") ? normalized.slice(0, normalized.indexOf("/")) : normalized;
  if (firstSeg === ownerId) {
    return siblingParallelAudioStoragePath(normalized);
  }
  return `${ownerId}/${videoAssetId}-parallel-audio.webm`;
}

/**
 * Uploads parallel-captured audio next to the video object in Storage and inserts `media_assets` (`kind = audio`).
 * Updates the video row `metadata.parallel_audio_media_asset_id`.
 *
 * Form: `file` (audio blob), `video_media_asset_id` (uuid).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let incoming: FormData;
    try {
      incoming = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
    }

    const file = incoming.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio file too large" }, { status: 400 });
    }

    const vidRaw = incoming.get("video_media_asset_id");
    const videoMediaAssetId = typeof vidRaw === "string" ? vidRaw.trim() : "";
    if (!videoMediaAssetId) {
      return NextResponse.json({ error: "video_media_asset_id is required" }, { status: 400 });
    }

    const { data: videoRow, error: vErr } = await supabase
      .from("media_assets")
      .select(
        "id, owner_id, kind, project_id, storage_path, storage_bucket, metadata, quiz_template_slug, duration_seconds, duration_ms",
      )
      .eq("id", videoMediaAssetId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!videoRow || videoRow.owner_id !== user.id) {
      return NextResponse.json({ error: "Video media not found" }, { status: 404 });
    }
    if (videoRow.kind !== "video") {
      return NextResponse.json({ error: "Target must be a video media asset" }, { status: 400 });
    }

    const videoPath = String(videoRow.storage_path ?? "").trim();
    if (!videoPath || videoRow.storage_bucket !== BUCKET) {
      return NextResponse.json({ error: "Invalid video storage path" }, { status: 422 });
    }

    const audioPath = parallelAudioObjectPath(user.id, videoPath, videoMediaAssetId);
    const mime = file.type?.trim() || "audio/webm";
    const durationMsFromForm = parseDurationMs(incoming.get("duration_ms"));
    const durationMs =
      durationMsFromForm ??
      (typeof videoRow.duration_ms === "number" && Number.isFinite(videoRow.duration_ms)
        ? videoRow.duration_ms
        : null);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(audioPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime,
    });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const baseMeta =
      videoRow.metadata && typeof videoRow.metadata === "object" && videoRow.metadata !== null
        ? { ...(videoRow.metadata as Record<string, unknown>) }
        : {};

    const { data: audioRow, error: insErr } = await supabase
      .from("media_assets")
      .insert({
        owner_id: user.id,
        project_id: videoRow.project_id,
        kind: "audio",
        storage_bucket: BUCKET,
        storage_path: audioPath,
        duration_seconds: videoRow.duration_seconds,
        duration_ms: durationMs,
        mime_type: mime,
        quiz_template_slug: videoRow.quiz_template_slug,
        metadata: {
          companion_video_media_asset_id: videoMediaAssetId,
          source: "record_tab_parallel_audio",
        },
      })
      .select("id")
      .single();

    if (insErr) {
      await supabase.storage.from(BUCKET).remove([audioPath]);
      throw insErr;
    }

    const { error: metaErr } = await supabase
      .from("media_assets")
      .update({
        metadata: {
          ...baseMeta,
          parallel_audio_media_asset_id: audioRow.id,
        },
      })
      .eq("id", videoMediaAssetId)
      .eq("owner_id", user.id);
    if (metaErr) {
      console.warn("parallel-audio: video metadata merge", metaErr);
    }

    return NextResponse.json({
      ok: true,
      audio_media_asset_id: audioRow.id,
      audio_storage_path: audioPath,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Parallel audio upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
