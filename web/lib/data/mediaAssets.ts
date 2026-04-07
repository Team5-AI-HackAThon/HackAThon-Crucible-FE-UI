import type { SupabaseClient } from "@supabase/supabase-js";

export type OwnerMediaRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  duration_seconds: number | null;
  published_at: string | null;
  created_at: string;
  quiz_template_slug: string | null;
  kind: string;
};

export type OwnerMediaWithUrl = OwnerMediaRow & { signedUrl: string | null };

/** Record-tab library list (no signed URLs — use for pickers). */
export async function fetchOwnerMediaList(supabase: SupabaseClient, userId: string): Promise<OwnerMediaRow[]> {
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, duration_seconds, published_at, created_at, quiz_template_slug, kind")
    .eq("owner_id", userId)
    .eq("kind", "video")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnerMediaWithSignedUrls(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnerMediaWithUrl[]> {
  const rows = await fetchOwnerMediaList(supabase, userId);
  if (!rows.length) return [];

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(row.storage_bucket)
        .createSignedUrl(row.storage_path, 3600);
      return { ...row, signedUrl: signed?.signedUrl ?? null };
    }),
  );
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
