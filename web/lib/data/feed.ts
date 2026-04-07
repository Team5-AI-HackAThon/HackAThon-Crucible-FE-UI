import type { SupabaseClient } from "@supabase/supabase-js";

/** Row from feed_items + joined media + project (RLS limits founders to own projects; VCs see all). */
export type FeedItemRow = {
  id: string;
  sort_key: string;
  live_scenario_tag: string | null;
  media_assets: {
    id: string;
    duration_seconds: number | null;
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
        duration_seconds,
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
