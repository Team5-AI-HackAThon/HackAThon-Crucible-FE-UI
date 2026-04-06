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
  quizTemplateSlug: QuizSlug;
}): Promise<{ mediaId: string; storagePath: string }> {
  const { supabase, userId, projectId, blob, durationSeconds, quizTemplateSlug } = params;
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

/** Removes DB row (cascades feed/sentiment FKs) then storage object. */
export async function deleteMediaAsset(
  supabase: SupabaseClient,
  row: { id: string; storage_bucket: string; storage_path: string },
): Promise<void> {
  const { error: delErr } = await supabase.from("media_assets").delete().eq("id", row.id);
  if (delErr) throw delErr;
  const { error: stErr } = await supabase.storage.from(row.storage_bucket).remove([row.storage_path]);
  if (stErr) console.warn("deleteMediaAsset: storage remove", stErr);
}
