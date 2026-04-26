import type { SupabaseClient } from "@supabase/supabase-js";

/** Aligns with Postgres enum `public.interest_action`. */
export type InterestAction = "interested" | "pass" | "save";

export function parseInterestAction(v: string | null): InterestAction | null {
  if (v == null || typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s === "interested" || s === "pass" || s === "save") return s;
  return null;
}

/** Stable pseudo-random tie-break from id (FNV-1a-ish) — not score-driven. */
function hashMatchIdForOrder(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Order cards for review: **open** (no `last_action` yet) first, then Save, Interested, Pass last.
 * Open rows use a stable pseudo-random order by `matchId` (not match %). Other bands: higher % first.
 */
export function sortMatchCardsPassesLast(rows: MatchCardRow[]): MatchCardRow[] {
  const band = (lastAction: string | null): number => {
    const a = parseInterestAction(lastAction);
    if (a === null) return 0;
    if (a === "save") return 1;
    if (a === "interested") return 2;
    return 3;
  };
  return [...rows].sort((a, b) => {
    const ba = band(a.lastAction);
    const bb = band(b.lastAction);
    if (ba !== bb) return ba - bb;
    if (ba === 0) return hashMatchIdForOrder(a.matchId) - hashMatchIdForOrder(b.matchId);
    return b.matchPct - a.matchPct;
  });
}

/** Fisher–Yates shuffle (returns a new array). Use e.g. before Auto-Accept so order is not score-driven. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j]!;
    out[j] = t!;
  }
  return out;
}

/** One row for the Matches tab (VC: deals aligned to them; founder: VCs matched to their startups). */
export type MatchCardRow = {
  matchId: string;
  projectId: string;
  projectName: string;
  /** Investor profile id on this match row (founder list); null if missing. */
  vcId: string | null;
  /** Card headline: startup / project name (both roles). */
  cardTitle: string;
  /** Card subline: VC view = founder meta; founder view = VC firm/partner · title · stage · raise. */
  cardSubtitle: string;
  matchPct: number;
  thesisFitPct: number;
  stageFitPct: number;
  /** Short labels from sentiment_summary.badges (e.g. "Clear Leadership") */
  badges: string[];
  lastAction: string | null;
};

type RawMatch = {
  id: string;
  vc_id?: string | null;
  match_score: number | string | null;
  thesis_fit: number | string | null;
  stage_fit: number | string | null;
  sentiment_summary: unknown;
  last_action: string | null;
  projects: null | {
    id: string;
    name: string;
    founder_id: string;
    metadata: Record<string, unknown> | null;
    project_stages: { name: string } | null | { name: string }[];
  };
  founder_profile?: { full_name: string | null; email: string | null } | null;
  /** Populated for founder match list (investor on the other side of the row). */
  vc?: {
    full_name: string | null;
    email: string | null;
    vc_profiles: { firm_name: string | null } | null | { firm_name: string | null }[];
  } | null;
};

function num(v: number | string | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function profileLabel(full_name: string | null, email: string | null): string {
  const n = full_name?.trim();
  if (n) return n;
  if (email) return email.split("@")[0] ?? "?";
  return "?";
}

function parseBadges(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const badges = (raw as { badges?: unknown }).badges;
  if (!Array.isArray(badges)) return [];
  return badges.filter((b): b is string => typeof b === "string" && b.trim().length > 0);
}

function stageLabel(project: NonNullable<RawMatch["projects"]>): string {
  const st = project.project_stages;
  const row = Array.isArray(st) ? st[0] : st;
  if (row?.name?.trim()) return row.name.trim();
  const meta = project.metadata;
  const m = meta && typeof meta.stage === "string" ? meta.stage.trim() : "";
  return m || "—";
}

function raiseLabel(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";
  const keys = ["raise", "funding", "round_size", "raise_label"] as const;
  for (const k of keys) {
    const v = metadata[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return `$${v}M`;
  }
  return "—";
}

function titleLabel(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "CEO";
  const t = metadata.founder_title;
  if (typeof t === "string" && t.trim()) return t.trim();
  return "CEO";
}

function vcFirmOrPartner(vc: NonNullable<RawMatch["vc"]>): string {
  const vp = vc.vc_profiles;
  const row = Array.isArray(vp) ? vp[0] : vp;
  const firm = row?.firm_name?.trim();
  if (firm) return firm;
  return profileLabel(vc.full_name, vc.email);
}

function normalizeRow(raw: RawMatch): MatchCardRow | null {
  const pj = raw.projects;
  if (!pj?.id || !pj.name) return null;
  const founderName = raw.founder_profile
    ? profileLabel(raw.founder_profile.full_name, raw.founder_profile.email)
    : "?";
  const meta = pj.metadata && typeof pj.metadata === "object" ? (pj.metadata as Record<string, unknown>) : null;
  const founderMetaLine = [founderName, titleLabel(meta), stageLabel(pj), raiseLabel(meta)].join(" · ");
  const vc = raw.vc;
  /** Startup name on every card; founder list puts VC on subtitle so one investor across rows is readable. */
  const cardTitle = pj.name;
  const cardSubtitle =
    vc && typeof vc === "object"
      ? [vcFirmOrPartner(vc), titleLabel(meta), stageLabel(pj), raiseLabel(meta)].join(" · ")
      : founderMetaLine;
  const matchPct = Math.round(num(raw.match_score, 0));
  const thesisFitPct = Math.min(100, Math.max(0, Math.round(num(raw.thesis_fit, 0))));
  const stageFitPct = Math.min(100, Math.max(0, Math.round(num(raw.stage_fit, 0))));
  return {
    matchId: raw.id,
    projectId: pj.id,
    projectName: pj.name,
    vcId: typeof raw.vc_id === "string" && raw.vc_id.length > 0 ? raw.vc_id : null,
    cardTitle,
    cardSubtitle,
    matchPct,
    thesisFitPct,
    stageFitPct,
    badges: parseBadges(raw.sentiment_summary),
    lastAction: raw.last_action,
  };
}

const matchSelect = `
  id,
  vc_id,
  match_score,
  thesis_fit,
  stage_fit,
  sentiment_summary,
  last_action,
  projects (
    id,
    name,
    founder_id,
    metadata,
    project_stages ( name )
  )
`;

/** VC: matches where this user is the investor. */
export async function fetchMatchCardsForVc(supabase: SupabaseClient, vcId: string): Promise<MatchCardRow[]> {
  const { data, error } = await supabase
    .from("project_vc_matches")
    .select(matchSelect)
    .eq("vc_id", vcId)
    .order("match_score", { ascending: false, nullsFirst: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as RawMatch[];
  const founderIds = [...new Set(rows.map((r) => r.projects?.founder_id).filter(Boolean))] as string[];
  if (founderIds.length === 0) return [];

  const { data: founders, error: fe } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", founderIds);
  if (fe) throw fe;
  const founderMap = new Map((founders ?? []).map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const fid = r.projects?.founder_id;
      const fp = fid ? founderMap.get(fid) : undefined;
      return normalizeRow({
        ...r,
        founder_profile: fp ? { full_name: fp.full_name, email: fp.email } : null,
      });
    })
    .filter((x): x is MatchCardRow => x != null);
}

const matchSelectFounder = `
  id,
  vc_id,
  match_score,
  thesis_fit,
  stage_fit,
  sentiment_summary,
  last_action,
  vc:profiles (
    full_name,
    email,
    vc_profiles ( firm_name )
  ),
  projects!inner (
    id,
    name,
    founder_id,
    metadata,
    project_stages ( name )
  )
`;

/** Founder: matches on this user's projects (VCs who matched). */
export async function fetchMatchCardsForFounder(
  supabase: SupabaseClient,
  founderId: string,
): Promise<MatchCardRow[]> {
  const { data, error } = await supabase
    .from("project_vc_matches")
    .select(matchSelectFounder)
    .eq("projects.founder_id", founderId)
    .order("match_score", { ascending: false, nullsFirst: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as RawMatch[];
  const { data: founders, error: fe } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", founderId)
    .maybeSingle();
  if (fe) throw fe;
  const fp = founders;

  return rows
    .map((r) =>
      normalizeRow({
        ...r,
        founder_profile: fp ? { full_name: fp.full_name, email: fp.email } : null,
      }),
    )
    .filter((x): x is MatchCardRow => x != null);
}

/**
 * Updates `project_vc_matches.last_action` (RLS: VC or project founder).
 * Use from Route Handlers with `createClient()` so the user session applies.
 */
export async function updateMatchLastAction(
  supabase: SupabaseClient,
  matchId: string,
  action: InterestAction,
): Promise<void> {
  const { data, error } = await supabase
    .from("project_vc_matches")
    .update({ last_action: action })
    .eq("id", matchId)
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error("Match not found or update not permitted");
  }
}

/** Browser: POST to Next API (cookie session); same RLS as direct Supabase update. */
export async function persistMatchActionFromClient(matchId: string, action: InterestAction): Promise<InterestAction> {
  const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ action }),
  });
  let body: { error?: string; lastAction?: string } = {};
  try {
    body = (await res.json()) as { error?: string; lastAction?: string };
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  const confirmed = parseInterestAction(body.lastAction ?? null);
  return confirmed ?? action;
}
