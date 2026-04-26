import type { SupabaseClient } from "@supabase/supabase-js";

export type FounderProjectOption = { id: string; name: string };

export async function fetchFounderProjects(
  supabase: SupabaseClient,
  founderId: string,
): Promise<FounderProjectOption[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("founder_id", founderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Row from feed_items + joined media + project (RLS limits founders to own projects; VCs see all). */
export type FeedItemRow = {
  id: string;
  sort_key: string;
  live_scenario_tag: string | null;
  media_assets: {
    id: string;
    owner_id: string;
    duration_seconds: number | null;
    duration_ms: number | null;
    quiz_template_slug: string | null;
    storage_bucket: string;
    storage_path: string;
    metadata: Record<string, unknown> | null;
  } | null;
  projects: {
    id: string;
    name: string;
    hq_city: string | null;
    one_line_pitch: string | null;
    founder_id: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

export async function fetchFeedItems(supabase: SupabaseClient): Promise<FeedItemRow[]> {
  const { data, error } = await supabase
    .from("feed_items")
    .select(
      `
      id,
      sort_key,
      live_scenario_tag,
      media_assets (
        id,
        owner_id,
        duration_seconds,
        duration_ms,
        quiz_template_slug,
        storage_bucket,
        storage_path,
        metadata
      ),
      projects (
        id,
        name,
        hq_city,
        one_line_pitch,
        founder_id,
        metadata
      )
    `,
    )
    .order("sort_key", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const ma = r.media_assets;
    const pj = r.projects;
    const media = (Array.isArray(ma) ? ma[0] : ma) ?? null;
    const project = (Array.isArray(pj) ? pj[0] : pj) ?? null;
    return {
      id: r.id as string,
      sort_key: r.sort_key as string,
      live_scenario_tag: (r.live_scenario_tag as string | null) ?? null,
      media_assets: media as FeedItemRow["media_assets"],
      projects: project as FeedItemRow["projects"],
    };
  });
}

export type FeedItemRowWithPlayback = FeedItemRow & { signedVideoUrl: string | null };

/** Signed URLs for in-feed playback (short-lived; refresh on feed reload). */
export async function attachSignedUrlsToFeedItems(
  supabase: SupabaseClient,
  items: FeedItemRow[],
): Promise<FeedItemRowWithPlayback[]> {
  return Promise.all(
    items.map(async (row) => {
      const m = row.media_assets;
      if (!m?.storage_bucket || !m?.storage_path) {
        return { ...row, signedVideoUrl: null };
      }
      const { data, error } = await supabase.storage
        .from(m.storage_bucket)
        .createSignedUrl(m.storage_path, 3600);
      if (error) {
        return { ...row, signedVideoUrl: null };
      }
      return { ...row, signedVideoUrl: data?.signedUrl ?? null };
    }),
  );
}

export function quizSlugToPromptHeadline(slug: string | null): string {
  if (!slug) return "Recording";
  if (slug === "fire_escape") return "🔥 Prompt 1 — Fire Escape · Dallas";
  if (slug === "tai_chi_japan") return "🗾 Prompt 2 — Tai-Chi · Japan";
  if (slug === "custom") return "✎ Custom scenario";
  return slug;
}

export function projectMetaMatchPct(metadata: Record<string, unknown> | null): string {
  const n = metadata?.match_pct;
  if (typeof n === "number") return `${Math.round(n)}%`;
  if (typeof n === "string" && n.trim()) return n.includes("%") ? n : `${n}%`;
  return "—";
}

export function projectMetaTags(metadata: Record<string, unknown> | null): string[] {
  const raw = metadata?.tags;
  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) return raw as string[];
  return [];
}

export function projectMetaStage(metadata: Record<string, unknown> | null): string | null {
  const s = metadata?.stage;
  return typeof s === "string" ? s : null;
}
