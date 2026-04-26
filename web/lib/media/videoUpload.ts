import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "crucible-media";
const BUCKET = MEDIA_BUCKET;

export type QuizSlug = "fire_escape" | "tai_chi_japan" | "custom";

function extForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

export async function uploadRecordedVideo(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string | null;
  blob: Blob;
  durationSeconds: number;
  /** Wall-clock length in ms when known (e.g. from MediaRecorder session). */
  durationMs?: number | null;
  quizTemplateSlug: QuizSlug;
}): Promise<{ mediaId: string; storagePath: string }> {
  const { supabase, userId, projectId, blob, durationSeconds, durationMs, quizTemplateSlug } = params;
  const ext = extForMime(blob.type || "video/webm");
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || "video/webm",
  });
  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from("media_assets")
    .insert({
      owner_id: userId,
      project_id: projectId,
      kind: "video",
      storage_bucket: BUCKET,
      storage_path: storagePath,
      duration_seconds: Math.round(durationSeconds),
      duration_ms:
        typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0
          ? Math.min(Math.floor(durationMs), 24 * 60 * 60 * 1000)
          : null,
      mime_type: blob.type || null,
      quiz_template_slug: quizTemplateSlug,
      metadata: { source: "record_tab_web" },
    })
    .select("id")
    .single();

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insErr;
  }

  return { mediaId: row.id, storagePath };
}

export async function publishMediaAsset(supabase: SupabaseClient, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from("media_assets")
    .update({ published_at: new Date().toISOString() })
    .eq("id", mediaId);
  if (error) throw error;
}

/** Removes DB row (cascades feed/sentiment FKs) then storage objects (video + optional audio). */
export async function deleteMediaAsset(
  supabase: SupabaseClient,
  row: {
    id: string;
    storage_bucket: string;
    storage_path: string;
    audio_storage_path?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const parallelIdRaw = row.metadata?.parallel_audio_media_asset_id;
  const parallelId =
    typeof parallelIdRaw === "string" && parallelIdRaw.trim().length > 0 ? parallelIdRaw.trim() : null;

  if (parallelId) {
    const { data: audioRow, error: arErr } = await supabase
      .from("media_assets")
      .select("id, storage_bucket, storage_path")
      .eq("id", parallelId)
      .maybeSingle();
    if (!arErr && audioRow) {
      const { error: delAudioDb } = await supabase.from("media_assets").delete().eq("id", parallelId);
      if (delAudioDb) throw delAudioDb;
      const { error: delAudioSt } = await supabase.storage.from(audioRow.storage_bucket).remove([audioRow.storage_path]);
      if (delAudioSt) console.warn("deleteMediaAsset: parallel audio storage remove", delAudioSt);
    }
  }

  const { error: delErr } = await supabase.from("media_assets").delete().eq("id", row.id);
  if (delErr) throw delErr;
  const paths = [row.storage_path];
  const audio = row.audio_storage_path?.trim();
  if (audio) paths.push(audio);
  const { error: stErr } = await supabase.storage.from(row.storage_bucket).remove(paths);
  if (stErr) console.warn("deleteMediaAsset: storage remove", stErr);
}
