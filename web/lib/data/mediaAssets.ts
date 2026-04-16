import type { SupabaseClient } from "@supabase/supabase-js";

export type SentimentOutputSummary = {
  id: string;
  is_processed: boolean;
  created_at: string;
};

/** Mirrors `public.media_assets` (Record tab library). */
export type OwnerMediaRow = {
  id: string;
  owner_id: string;
  project_id: string | null;
  kind: string;
  storage_bucket: string;
  storage_path: string;
  duration_seconds: number | null;
  mime_type: string | null;
  published_at: string | null;
  quiz_template_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sentiment_outputs: SentimentOutputSummary[] | null;
};

export type OwnerMediaWithUrl = OwnerMediaRow & { signedUrl: string | null };

function normalizeSentimentOutputs(raw: unknown): SentimentOutputSummary[] | null {
  if (raw == null) return null;
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: SentimentOutputSummary[] = [];
  for (const x of arr) {
    if (x && typeof x === "object" && "id" in x) {
      const o = x as Record<string, unknown>;
      out.push({
        id: String(o.id),
        is_processed: Boolean(o.is_processed),
        created_at: typeof o.created_at === "string" ? o.created_at : "",
      });
    }
  }
  return out.length ? out : null;
}

/** Latest sentiment row for UI (by created_at). */
export function latestSentimentOutput(row: OwnerMediaRow): SentimentOutputSummary | null {
  const list = row.sentiment_outputs;
  if (!list?.length) return null;
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

/** Record-tab library list (no signed URLs — use for pickers). */
export async function fetchOwnerMediaList(supabase: SupabaseClient, userId: string): Promise<OwnerMediaRow[]> {
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      `
      id,
      owner_id,
      project_id,
      kind,
      storage_bucket,
      storage_path,
      duration_seconds,
      mime_type,
      published_at,
      quiz_template_slug,
      metadata,
      created_at,
      updated_at,
      sentiment_outputs ( id, is_processed, created_at )
    `,
    )
    .eq("owner_id", userId)
    .eq("kind", "video")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      owner_id: row.owner_id as string,
      project_id: (row.project_id as string | null) ?? null,
      kind: row.kind as string,
      storage_bucket: row.storage_bucket as string,
      storage_path: row.storage_path as string,
      duration_seconds: (row.duration_seconds as number | null) ?? null,
      mime_type: (row.mime_type as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      quiz_template_slug: (row.quiz_template_slug as string | null) ?? null,
      metadata:
        row.metadata && typeof row.metadata === "object" && row.metadata !== null
          ? (row.metadata as Record<string, unknown>)
          : {},
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      sentiment_outputs: normalizeSentimentOutputs(row.sentiment_outputs),
    };
  });
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
