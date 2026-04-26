"use client";

import type { Role } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  attachSignedUrlsToFeedItems,
  fetchFeedItems,
  fetchFounderProjects,
  projectMetaMatchPct,
  projectMetaStage,
  projectMetaTags,
  quizSlugToPromptHeadline,
  type FeedItemRowWithPlayback,
  type FounderProjectOption,
} from "@/lib/data/feed";
import { fetchOwnerMediaList, formatDuration, type OwnerMediaRow } from "@/lib/data/mediaAssets";
import type { InboxPreview } from "@/lib/data/inbox";
import {
  fetchMatchCardsForFounder,
  fetchMatchCardsForVc,
  parseInterestAction,
  persistMatchActionFromClient,
  shuffleArray,
  sortMatchCardsPassesLast,
  type InterestAction,
  type MatchCardRow,
} from "@/lib/data/matches";
import { AppScreenHeader } from "./AppScreenHeader";

const FEED_CHIPS = ["All", "🔥 Trending", "Seed", "AI / ML", "Climate"] as const;
const FOUNDER_CHIPS = ["Browse VCs", "My Videos", "Saved", "Intros"] as const;

export { AppScreenHeader } from "./AppScreenHeader";
export { RecordScreen } from "./RecordScreen";

type FeedProps = {
  role: Role;
  onOpenModal: () => void;
  firstName: string;
  userId: string;
  /** Bumps when another screen (e.g. Record) publishes so the feed refetches. */
  feedRefreshNonce?: number;
};

const GRADS = ["g1", "g2", "g3"] as const;

function recordingPickerLabel(row: OwnerMediaRow): string {
  const dur = formatDuration(row.duration_seconds);
  const when = new Date(row.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dur} · ${when}`;
}

function FeedAddModal({
  open,
  onClose,
  userId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated: () => void;
}) {
  const [projects, setProjects] = useState<FounderProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [source, setSource] = useState<"url" | "library">("library");
  const [libraryRows, setLibraryRows] = useState<OwnerMediaRow[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [liveTag, setLiveTag] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !userId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    setLoadingProjects(true);
    setFormErr(null);
    void fetchFounderProjects(supabase, userId)
      .then((rows) => {
        if (!cancelled) {
          setProjects(rows);
          setProjectId((prev) => {
            if (prev && rows.some((r) => r.id === prev)) return prev;
            return rows[0]?.id ?? "";
          });
        }
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLibraryRows([]);
      return;
    }
    let cancelled = false;
    setLoadingLibrary(true);
    void fetchOwnerMediaList(supabase, userId)
      .then((rows) => {
        if (!cancelled) {
          setLibraryRows(rows);
          setMediaAssetId((prev) => {
            if (prev && rows.some((r) => r.id === prev)) return prev;
            return rows[0]?.id ?? "";
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLibraryRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLibrary(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!projectId.trim()) {
      setFormErr("Choose a project.");
      return;
    }
    if (source === "library") {
      if (!mediaAssetId.trim()) {
        setFormErr("Select a recording from the Record tab library, or switch to URL.");
        return;
      }
    } else if (!videoUrl.trim()) {
      setFormErr("Paste a video URL, or choose a recording from the library.");
      return;
    }
    setSubmitting(true);
    try {
      const res =
        source === "library"
          ? await fetch("/api/feed/from-recording", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                projectId: projectId.trim(),
                mediaAssetId: mediaAssetId.trim(),
                liveScenarioTag: liveTag.trim() || null,
              }),
            })
          : await fetch("/api/feed/from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                projectId: projectId.trim(),
                videoUrl: videoUrl.trim(),
                liveScenarioTag: liveTag.trim() || null,
              }),
            });
      const json = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setFormErr(json.error ?? "Could not add to feed.");
        return;
      }
      setVideoUrl("");
      setLiveTag("");
      onCreated();
      onClose();
    } catch {
      setFormErr("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed-add-overlay" onClick={onClose} role="presentation">
      <div className="feed-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feed-add-title">Add to feed</div>
        <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.45, marginBottom: 14 }}>
          Publish from your <strong style={{ color: "var(--paper)" }}>Record</strong> library (same uploads as the Record
          tab), or paste a URL (YouTube or direct .mp4 / .webm URL imports on the server).
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label htmlFor="feed-proj">Project</label>
          <select
            id="feed-proj"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loadingProjects || projects.length === 0}
          >
            {projects.length === 0 ? (
              <option value="">No projects — create one from Profile first</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
          <label htmlFor="feed-source">Video source</label>
          <select
            id="feed-source"
            value={source}
            onChange={(e) => {
              const v = e.target.value as "url" | "library";
              setSource(v);
              setFormErr(null);
            }}
          >
            <option value="library">Record library</option>
            <option value="url">Paste URL (YouTube or direct file)</option>
          </select>
          {source === "library" ? (
            <>
              <label htmlFor="feed-library">Recording</label>
              <select
                id="feed-library"
                value={mediaAssetId}
                onChange={(e) => setMediaAssetId(e.target.value)}
                disabled={loadingLibrary || libraryRows.length === 0}
              >
                {libraryRows.length === 0 ? (
                  <option value="">
                    {loadingLibrary ? "Loading recordings…" : "No recordings — use Record tab first"}
                  </option>
                ) : (
                  libraryRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {recordingPickerLabel(row)}
                    </option>
                  ))
                )}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="feed-url">Video URL</label>
              <input
                id="feed-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.youtube.com/watch?v=… or https://…/clip.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </>
          )}
          <label htmlFor="feed-live">Live scenario (optional)</label>
          <textarea
            id="feed-live"
            placeholder="Short tag shown on the feed banner…"
            value={liveTag}
            onChange={(e) => setLiveTag(e.target.value)}
          />
          {formErr && (
            <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 10 }}>{formErr}</p>
          )}
          <div className="feed-add-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={
                submitting ||
                projects.length === 0 ||
                (source === "url" ? !videoUrl.trim() : !mediaAssetId.trim() || libraryRows.length === 0)
              }
            >
              {submitting
                ? source === "library"
                  ? "Publishing…"
                  : "Importing…"
                : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FeedScreen({ role, onOpenModal, firstName, userId, feedRefreshNonce = 0 }: FeedProps) {
  const [chip, setChip] = useState(0);
  const [items, setItems] = useState<FeedItemRowWithPlayback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [feedKey, setFeedKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const badge = role === "founder" ? "Founder View" : "VC View";
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";

  /** Single primitive so useEffect deps stay a fixed-length tuple (avoids React "dependency array changed size" in dev). */
  const feedLoadVersion = useMemo(
    () => `${feedKey}:${feedRefreshNonce}`,
    [feedKey, feedRefreshNonce],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    void fetchFeedItems(supabase)
      .then(async (rows) => {
        const withUrls = await attachSignedUrlsToFeedItems(supabase, rows);
        if (!cancelled) setItems(withUrls);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Could not load feed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, feedLoadVersion]);

  const liveLine =
    items[0]?.live_scenario_tag ??
    "48th floor, Santander Building, Dallas. Floors 20–30 on fire.";

  return (
    <>
      <AppScreenHeader
        firstName={firstName}
        rightSlot={
          <>
            <div className="role-badge">{badge}</div>
            <div className="hdr-avatar">{av}</div>
          </>
        }
      />
      {role === "founder" && (
        <div className="feed-add-strip">
          <button type="button" className="feed-add-btn" onClick={() => setShowAdd(true)}>
            +Add
          </button>
        </div>
      )}
      <div className="chip-row">
        {FEED_CHIPS.map((c, i) => (
          <div
            key={c}
            className={`chip${chip === i ? " active" : ""}`}
            onClick={() => setChip(i)}
            role="button"
          >
            {c}
          </div>
        ))}
      </div>
      <FeedAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        userId={userId}
        onCreated={() => setFeedKey((k) => k + 1)}
      />
      <div className="sa">
        <div className="live-banner">
          <div className="lb-left">
            <div className="lb-tag">
              <div className="live-dot" style={{ display: "inline-block", verticalAlign: "middle" }} />
              &nbsp;Live Scenario
            </div>
            <div className="lb-text">&quot;{liveLine}&quot;</div>
          </div>
          <div className="lb-right">
            <div className="lb-num">{items.length > 0 ? String(items.length) : "—"}</div>
            <div className="lb-sub">in feed</div>
          </div>
        </div>
        <div className="sec">
          {loading
            ? "// Loading feed…"
            : `// New Submissions · ${items.length} ${items.length === 1 ? "item" : "items"}`}
        </div>
        {loadErr && (
          <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 12 }}>{loadErr}</p>
        )}
        {!loading &&
          items.map((row, i) => (
            <FeedCard
              key={row.id}
              g={GRADS[i % GRADS.length]}
              item={row}
              userId={userId}
              onOpen={onOpenModal}
              onRemoved={() => setFeedKey((k) => k + 1)}
            />
          ))}
        {!loading && items.length === 0 && !loadErr && (
          <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
            No feed items yet. Run the feed seed migration and sign in as a demo founder or VC (see
            supabase/README.md), or publish a recording from the Record tab.
          </p>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

function FeedCard({
  g,
  item,
  userId,
  onOpen,
  onRemoved,
}: {
  g: string;
  item: FeedItemRowWithPlayback;
  userId: string;
  onOpen: () => void;
  onRemoved: () => void;
}) {
  const [acts, setActs] = useState({ interested: false, pass: false, save: false });
  const [removing, setRemoving] = useState(false);
  const [removeErr, setRemoveErr] = useState<string | null>(null);

  const m = item.media_assets;
  const isUploader = Boolean(userId && m?.owner_id === userId);
  const p = item.projects;
  const meta = p?.metadata ?? null;
  const match = projectMetaMatchPct(meta);
  const stage = projectMetaStage(meta);
  const tags = projectMetaTags(meta);
  const dur = formatDuration(m?.duration_seconds ?? null);
  const slug = m?.quiz_template_slug ?? null;
  const headline = quizSlugToPromptHeadline(slug);
  const pitch = p?.one_line_pitch?.trim() ?? "";
  const hq = p?.hq_city?.trim() ?? "";
  const name = p?.name?.trim() ?? "Startup";
  const subParts = [hq, stage].filter(Boolean);
  const subtitle = subParts.length > 0 ? subParts.join(" · ") : "—";

  const signedVideoUrl = item.signedVideoUrl;

  return (
    <div className="vcard" onClick={onOpen}>
      <div className="vthumb">
        {isUploader ? (
          <button
            type="button"
            className="feed-remove-btn"
            aria-label="Remove from feed"
            disabled={removing}
            onClick={(e) => {
              e.stopPropagation();
              if (removing) return;
              if (
                !window.confirm(
                  "Remove this post from the feed? Others will no longer see it here.",
                )
              ) {
                return;
              }
              setRemoveErr(null);
              setRemoving(true);
              void fetch(`/api/feed/item/${encodeURIComponent(item.id)}`, { method: "DELETE" })
                .then(async (res) => {
                  const j = (await res.json().catch(() => ({}))) as { error?: string };
                  if (!res.ok) {
                    setRemoveErr(typeof j.error === "string" ? j.error : "Could not remove.");
                    return;
                  }
                  onRemoved();
                })
                .catch(() => setRemoveErr("Could not remove."))
                .finally(() => setRemoving(false));
            }}
          >
            {removing ? "…" : "Remove"}
          </button>
        ) : null}
        {signedVideoUrl ? (
          <video
            className="feed-card-video"
            src={signedVideoUrl}
            controls
            playsInline
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className={`vthumb-bg ${g}`} />
            <div className="vthumb-grain" />
            <div className="vplay">
              <div className="play-c">▶</div>
              <div className="vdur">{dur}</div>
            </div>
          </>
        )}
        {!signedVideoUrl ? (
          <div className="vfaces">
            <div className="vface fa">{name.charAt(0).toUpperCase()}</div>
            <div className="vface fb">▶</div>
            <div className="vface fc">◇</div>
          </div>
        ) : null}
        <div className="vmatch" style={{ zIndex: 2, pointerEvents: "none" }}>
          {match} match
        </div>
        {removeErr ? (
          <div className="feed-remove-err" onClick={(e) => e.stopPropagation()}>
            {removeErr}
          </div>
        ) : null}
      </div>
      <div className="sent-row">
        <div className="sent-badge sent-lead">⚡ Clear Leadership</div>
        <div className="sent-badge sent-energy">🔆 High Energy</div>
        <div className="sent-badge sent-comm">🗣 Strong Comm.</div>
      </div>
      <div className="cbody">
        <div className="cscen">{headline}</div>
        <div className="cprompt">
          {pitch
            ? `"${pitch}"`
            : `"48th floor. Floors 20–30 on fire. How does your team get out?"`}
        </div>
        <div className="cco-row">
          <div className="cco-dot d1">{name.charAt(0).toUpperCase()}</div>
          <div className="cco-info">
            <div className="cco-name">{name}</div>
            <div className="cco-sub">{subtitle}</div>
          </div>
          <div className="stage-p">{stage ?? "—"}</div>
        </div>
        <div className="ctags">
          {(tags.length > 0 ? tags : ["Demo", "Crucible"]).map((t, ti) => (
            <span key={`${ti}-${t}`} className="ctag">
              {t}
            </span>
          ))}
        </div>
        <div className="cactions">
          <button
            type="button"
            className="act-btn act-interested"
            style={{ opacity: acts.interested ? 1 : 0.4 }}
            onClick={(e) => {
              e.stopPropagation();
              setActs((a) => ({ ...a, interested: true, pass: false, save: false }));
            }}
          >
            ✓ Interested
          </button>
          <button
            type="button"
            className="act-btn act-pass"
            style={{ opacity: acts.pass ? 1 : 0.4 }}
            onClick={(e) => {
              e.stopPropagation();
              setActs((a) => ({ ...a, pass: true, interested: false, save: false }));
            }}
          >
            ✕ Pass
          </button>
          <button
            type="button"
            className="act-btn act-save"
            style={{ opacity: acts.save ? 1 : 0.4 }}
            onClick={(e) => {
              e.stopPropagation();
              setActs((a) => ({ ...a, save: true, interested: false, pass: false }));
            }}
          >
            ♡ Save
          </button>
        </div>
      </div>
    </div>
  );
}

function matchBadgePrefix(i: number): string {
  if (i === 0) return "⚡ ";
  if (i === 1) return "🔆 ";
  return "· ";
}

/** After Interested/Save: compact card reflows; nudge scroll so the next card is easier to reach. */
function nudgeScrollAfterMatchAct(cardRoot: HTMLElement | null) {
  if (!cardRoot) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const scrollParent = cardRoot.closest(".sa") as HTMLElement | null;
      const next = cardRoot.nextElementSibling as HTMLElement | null;
      if (next?.classList.contains("match-card")) {
        next.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else if (scrollParent) {
        scrollParent.scrollBy({ top: -100, behavior: "smooth" });
      }
    });
  });
}

function MatchPipelineCard({
  row,
  onRowUpdated,
  viewerRole,
  onOpenInboxThread,
  pipelineActionsLocked,
}: {
  row: MatchCardRow;
  onRowUpdated: (matchId: string, patch: Partial<MatchCardRow>) => void;
  viewerRole: Role;
  onOpenInboxThread?: (conversationId: string) => void;
  /** True while parent runs Auto-Accept — disables manual Pass/Save/Interested. */
  pipelineActionsLocked?: boolean;
}) {
  const letter = row.cardTitle.charAt(0).toUpperCase();
  const scoreClass = row.matchPct >= 85 ? "score-green" : "score-amber";
  const committed = parseInterestAction(row.lastAction);
  const showActionButtons = committed === null;
  const acted = committed === "interested" || committed === "save" || committed === "pass";
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function persist(action: InterestAction) {
    const previous = row.lastAction;
    setSaveErr(null);
    setSaving(true);
    if (action === "pass") {
      onRowUpdated(row.matchId, { lastAction: action });
      try {
        const confirmed = await persistMatchActionFromClient(row.matchId, action);
        onRowUpdated(row.matchId, { lastAction: confirmed });
      } catch (e: unknown) {
        onRowUpdated(row.matchId, { lastAction: previous });
        setSaveErr(e instanceof Error ? e.message : "Could not save.");
      } finally {
        setSaving(false);
      }
      return;
    }

    onRowUpdated(row.matchId, { lastAction: action });
    try {
      const confirmed = await persistMatchActionFromClient(row.matchId, action);
      onRowUpdated(row.matchId, { lastAction: confirmed });
      nudgeScrollAfterMatchAct(cardRef.current);
    } catch (e: unknown) {
      onRowUpdated(row.matchId, { lastAction: previous });
      setSaveErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={cardRef}
      className={`match-card${acted ? " match-card--acted" : ""}`}
      data-match-id={row.matchId}
    >
      <div className="mc-top">
        <div className="mc-avatar" style={{ background: "linear-gradient(135deg,#e5431a,#c8a44a)" }}>
          {letter}
        </div>
        <div className="mc-info">
          <div className="mc-name">{row.cardTitle}</div>
          <div className="mc-sub">{row.cardSubtitle}</div>
        </div>
        <div className={`mc-score-pill ${scoreClass}`}>{row.matchPct}%</div>
      </div>
      <div className="mc-bars">
        <div className="mc-bar-row">
          <div className="mc-bar-lbl">Thesis Fit</div>
          <div className="mc-bar-track">
            <div
              className="mc-bar-fill"
              style={{ width: `${row.thesisFitPct}%`, background: "var(--sage)" }}
            />
          </div>
        </div>
        <div className="mc-bar-row">
          <div className="mc-bar-lbl">Stage</div>
          <div className="mc-bar-track">
            <div
              className="mc-bar-fill"
              style={{ width: `${row.stageFitPct}%`, background: "var(--sage)" }}
            />
          </div>
        </div>
      </div>
      {row.badges.length > 0 ? (
        <div className="mc-sent-row">
          {row.badges.slice(0, 4).map((b, i) => (
            <div key={`${b}-${i}`} className={`sent-badge${i === 0 ? " sent-lead" : i === 1 ? " sent-energy" : ""}`}>
              {matchBadgePrefix(i)}
              {b}
            </div>
          ))}
        </div>
      ) : null}
      {committed === "interested" ? (
        <div className="mc-intent-row" aria-live="polite">
          <div className="mc-intent-tag mc-intent-interested">✓ Interested</div>
          {viewerRole === "founder" && row.vcId && onOpenInboxThread ? (
            <button
              type="button"
              className="mc-intent-chat"
              disabled={chatBusy}
              aria-label="Open inbox chat with this investor"
              title="Chat about this project"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSaveErr(null);
                setChatBusy(true);
                void (async () => {
                  try {
                    const res = await fetch("/api/inbox/match-thread", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ matchId: row.matchId }),
                    });
                    const body = (await res.json()) as { error?: string; conversationId?: string };
                    if (!res.ok) {
                      throw new Error(body.error ?? res.statusText);
                    }
                    if (typeof body.conversationId === "string") {
                      onOpenInboxThread(body.conversationId);
                    }
                  } catch (err: unknown) {
                    setSaveErr(err instanceof Error ? err.message : "Could not open chat.");
                  } finally {
                    setChatBusy(false);
                  }
                })();
              }}
            >
              <span className="mc-intent-chat-icon" aria-hidden>
                💬
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
      {committed === "save" ? (
        <div className="mc-intent-row" aria-live="polite">
          <div className="mc-intent-tag mc-intent-save">♡ Saved</div>
        </div>
      ) : null}
      {committed === "pass" ? (
        <div className="mc-intent-row" aria-live="polite">
          <div className="mc-intent-tag mc-intent-pass">✕ Passed</div>
        </div>
      ) : null}
      {showActionButtons ? (
        <div
          className="mc-actions"
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="Match interest"
          aria-busy={saving || !!pipelineActionsLocked}
        >
          <button
            type="button"
            className="act-btn act-interested match-act-off"
            aria-pressed={false}
            disabled={saving || !!pipelineActionsLocked}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void persist("interested");
            }}
          >
            ✓ Interested
          </button>
          <button
            type="button"
            className="act-btn act-pass match-act-off"
            aria-pressed={false}
            disabled={saving || !!pipelineActionsLocked}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void persist("pass");
            }}
          >
            ✕ Pass
          </button>
          <button
            type="button"
            className="act-btn act-save match-act-off"
            aria-pressed={false}
            disabled={saving || !!pipelineActionsLocked}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void persist("save");
            }}
          >
            ♡ Save
          </button>
        </div>
      ) : null}
      {saveErr ? (
        <p style={{ color: "var(--ember)", fontSize: 11, padding: "0 16px 12px", margin: 0 }}>{saveErr}</p>
      ) : null}
    </div>
  );
}

export function MatchesScreen({
  firstName,
  userId,
  viewerRole,
  onOpenInboxThread,
}: {
  firstName: string;
  userId: string;
  viewerRole: Role;
  onOpenInboxThread?: (conversationId: string) => void;
}) {
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";
  const [cards, setCards] = useState<MatchCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [autoAcceptBusy, setAutoAcceptBusy] = useState(false);
  const autoAcceptAbortRef = useRef(false);
  const autoAcceptBusyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) {
      setLoading(false);
      setCards([]);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    const run =
      viewerRole === "vc"
        ? fetchMatchCardsForVc(supabase, userId)
        : fetchMatchCardsForFounder(supabase, userId);
    void run
      .then((rows) => {
        if (!cancelled) setCards(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Could not load matches.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, viewerRole]);

  const matchCardsDisplay = useMemo(() => sortMatchCardsPassesLast(cards), [cards]);

  const pendingInterestCount = useMemo(
    () => matchCardsDisplay.filter((r) => parseInterestAction(r.lastAction) === null).length,
    [matchCardsDisplay],
  );

  const runAutoAccept = useCallback(() => {
    if (autoAcceptBusyRef.current) return;
    const pending = sortMatchCardsPassesLast([...cards]).filter(
      (r) => parseInterestAction(r.lastAction) === null,
    );
    const targets = shuffleArray(pending);
    if (targets.length === 0) return;
    autoAcceptAbortRef.current = false;
    autoAcceptBusyRef.current = true;
    setAutoAcceptBusy(true);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    void (async () => {
      try {
        for (const row of targets) {
          if (autoAcceptAbortRef.current) break;
          const cardEl = document.querySelector(
            `[data-match-id="${row.matchId}"]`,
          ) as HTMLElement | null;
          cardEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
          await sleep(380 + Math.random() * 520);
          if (autoAcceptAbortRef.current) break;
          const mid = row.matchId;
          const previous = row.lastAction;
          setCards((prev) => prev.map((x) => (x.matchId === mid ? { ...x, lastAction: "interested" } : x)));
          try {
            const confirmed = await persistMatchActionFromClient(mid, "interested");
            setCards((prev) => prev.map((x) => (x.matchId === mid ? { ...x, lastAction: confirmed } : x)));
          } catch {
            setCards((prev) => prev.map((x) => (x.matchId === mid ? { ...x, lastAction: previous } : x)));
          }
          await sleep(200 + Math.random() * 280);
        }
      } finally {
        autoAcceptBusyRef.current = false;
        setAutoAcceptBusy(false);
      }
    })();
  }, [cards]);

  useEffect(() => {
    autoAcceptAbortRef.current = false;
    return () => {
      autoAcceptAbortRef.current = true;
    };
  }, []);

  const heroSub =
    viewerRole === "vc" ? "Investor · projects aligned to you" : "Founder · VC interest on your startups";

  return (
    <>
      <AppScreenHeader
        firstName={firstName}
        rightSlot={
          <>
            <div className="role-badge">Matches</div>
            <div className="hdr-avatar">{av}</div>
          </>
        }
      />
      <div className="sa">
        <div className="dash-hero">
          <div className="dash-hero-bg" />
          <div className="dash-hero-label">{"// Matching Dashboard"}</div>
          <div className="dash-hero-title">
            {firstName && firstName !== "there" ? firstName : "You"}
            <br />
            <em>{heroSub}</em>
          </div>
          {!loading ? (
            <div className="dash-hero-auto">
              <div className="dash-hero-auto-actions">
                <button
                  type="button"
                  className="act-btn act-interested dash-hero-autorun-run"
                  disabled={autoAcceptBusy || pendingInterestCount === 0}
                  aria-busy={autoAcceptBusy}
                  aria-label={
                    pendingInterestCount === 0
                      ? "Auto-Accept: no open matches"
                      : `Auto-Accept ${pendingInterestCount} open match${pendingInterestCount === 1 ? "" : "es"}`
                  }
                  onClick={() => runAutoAccept()}
                >
                  {autoAcceptBusy ? "Accepting…" : "Auto-Accept"}
                </button>
                {autoAcceptBusy ? (
                  <button
                    type="button"
                    className="act-btn dash-hero-autorun-stop"
                    onClick={() => {
                      autoAcceptAbortRef.current = true;
                    }}
                  >
                    Stop
                  </button>
                ) : null}
              </div>
              <span className="dash-hero-auto-hint">
                {autoAcceptBusy
                  ? "Working through matches…"
                  : pendingInterestCount === 0
                    ? "No open matches — mark cards as Pass / Save / Interested first, or load seed data."
                    : `${pendingInterestCount} open · click to mark Interested in random order`}
              </span>
            </div>
          ) : null}
          <div className="dash-metric-grid">
            <div className="dmg-item">
              <div className="dmg-num" style={{ color: "var(--ember)" }}>
                34%
              </div>
              <div className="dmg-lbl">Match Accept Rate</div>
            </div>
            <div className="dmg-item">
              <div className="dmg-num" style={{ color: "var(--gold)" }}>
                8.4m
              </div>
              <div className="dmg-lbl">Avg Watch Time</div>
            </div>
            <div className="dmg-item">
              <div className="dmg-num" style={{ color: "var(--sage)" }}>
                62%
              </div>
              <div className="dmg-lbl">Founder Response</div>
            </div>
            <div className="dmg-item">
              <div className="dmg-num" style={{ color: "var(--sky)" }}>
                71%
              </div>
              <div className="dmg-lbl">Quiz Completion</div>
            </div>
          </div>
        </div>
        <div className="match-quality-legend">
          <div className="mql-title">{"// Match Quality Indicator"}</div>
          <div className="mql-rows">
            <div className="mql-row">
              <div className="mql-dot" style={{ background: "var(--sage)" }} />
              <div className="mql-name">Strong Match</div>
              <div className="mql-range">85–100%</div>
            </div>
            <div className="mql-row">
              <div className="mql-dot" style={{ background: "var(--gold)" }} />
              <div className="mql-name">Good Match</div>
              <div className="mql-range">65–84%</div>
            </div>
          </div>
        </div>
        <div className="sec">{loading ? "// Loading matches…" : "// Top Matches For You"}</div>
        {loadErr ? (
          <p style={{ color: "var(--ember)", fontSize: 12, padding: "0 16px 12px", margin: 0 }}>{loadErr}</p>
        ) : null}
        {!loading && cards.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 12, padding: "0 16px 16px", margin: 0, lineHeight: 1.5 }}>
            No match rows yet. As a VC, run{" "}
            <code style={{ fontSize: 10 }}>supabase/manual/seed_matches_vc_founder_demo.sql</code> after feed seed,
            then refresh. Founders see matches where <code style={{ fontSize: 10 }}>project_vc_matches</code> references
            their <code style={{ fontSize: 10 }}>projects</code>.
          </p>
        ) : null}
        {matchCardsDisplay.map((row) => (
          <MatchPipelineCard
            key={row.matchId}
            row={row}
            viewerRole={viewerRole}
            onOpenInboxThread={onOpenInboxThread}
            pipelineActionsLocked={autoAcceptBusy}
            onRowUpdated={(matchId, patch) =>
              setCards((prev) => prev.map((r) => (r.matchId === matchId ? { ...r, ...patch } : r)))
            }
          />
        ))}
        <div className="spacer" />
      </div>
    </>
  );
}

export function ProfileScreen({
  onNewVideo,
  onSignOut,
  firstName,
  avatarLabel = "J",
  profileRoleLabel = "Founder",
  onAddProject,
}: {
  onNewVideo: () => void;
  onSignOut?: () => void;
  firstName: string;
  avatarLabel?: string;
  profileRoleLabel?: string;
  /** Founders only: open add-project flow */
  onAddProject?: () => void;
}) {
  const [chip, setChip] = useState(0);
  return (
    <>
      <AppScreenHeader
        firstName={firstName}
        rightSlot={
          <>
            <div
              className="role-badge"
              style={{
                color: "var(--sky)",
                background: "var(--sky2)",
                borderColor: "rgba(26,111,168,.2)",
              }}
            >
              {profileRoleLabel}
            </div>
            <div className="hdr-avatar" style={{ background: "linear-gradient(135deg,#1a6fa8,#00c4ff)" }}>
              {avatarLabel}
            </div>
          </>
        }
      />
      {onAddProject && (
        <div className="profile-add-project-row">
          <button type="button" className="profile-add-project-btn" onClick={onAddProject}>
            +Project
          </button>
        </div>
      )}
      <div className="founder-stats">
        <div className="fst">
          <div className="fst-num" style={{ color: "var(--ember)" }}>
            4
          </div>
          <div className="fst-lbl">Videos</div>
        </div>
        <div className="fst">
          <div className="fst-num" style={{ color: "var(--gold)" }}>
            12
          </div>
          <div className="fst-lbl">VC Views</div>
        </div>
        <div className="fst">
          <div className="fst-num" style={{ color: "var(--sky)" }}>
            3
          </div>
          <div className="fst-lbl">Saved</div>
        </div>
        <div className="fst">
          <div className="fst-num" style={{ color: "var(--sage)" }}>
            2
          </div>
          <div className="fst-lbl">Intros</div>
        </div>
      </div>
      <div className="chip-row">
        {FOUNDER_CHIPS.map((c, i) => (
          <div
            key={c}
            className={`chip${chip === i ? " active" : ""}`}
            onClick={() => setChip(i)}
            role="button"
          >
            {c}
          </div>
        ))}
      </div>
      <div className="sa">
        <div className="sec">{"// My Submissions"}</div>
        <div className="hscroll" style={{ marginBottom: 14 }}>
          <div className="sub-thumb">
            <div className="st-vid" style={{ background: "linear-gradient(135deg,#1a0800,#e5431a)" }}>
              <div className="st-play">▶</div>
              <div className="st-dur">2:47</div>
            </div>
            <div className="st-body">
              <div className="st-views">👁 1.2k · 3 saves</div>
              <div className="st-lbl">Fire Escape</div>
            </div>
          </div>
          <div className="sub-thumb">
            <div className="st-vid" style={{ background: "linear-gradient(135deg,#001520,#1a6fa8)" }}>
              <div className="st-play">▶</div>
              <div className="st-dur">1:55</div>
            </div>
            <div className="st-body">
              <div className="st-views">👁 890 · 1 save</div>
              <div className="st-lbl">Tai-Chi Japan</div>
            </div>
          </div>
          <div className="sub-thumb sub-add" onClick={onNewVideo} role="button">
            <div className="sub-add-icon">＋</div>
            <div className="sub-add-lbl">New Video</div>
          </div>
        </div>
        <div className="sec">{"// Investor Matches"}</div>
        <div className="vcpc">
          <div className="vcpc-top">
            <div className="vc-av vca1">A</div>
            <div className="vcpc-info">
              <div className="vcpc-name">Alex Rivera</div>
              <div className="vcpc-firm">Partner · Benchmark Capital</div>
              <div className="vcpc-check">$500K – $3M · Seed</div>
            </div>
            <div className="vcpc-thesis">
              <span style={{ fontSize: 16 }}>▶</span>
              <div className="vcpc-thesis-lbl">
                Thesis
                <br />
                Video
              </div>
            </div>
          </div>
          <div className="vcpc-body">
            <div className="vcpc-bio">
              Focuses on operational resilience. Evaluates how founders communicate under real pressure.
            </div>
            <div className="vcpc-filters">
              <span className="vcpc-filter">B2B SaaS</span>
              <span className="vcpc-filter">AI Infra</span>
              <span className="vcpc-filter">Seed</span>
            </div>
            <div className="match-bar-row">
              <div className="mbl">Thesis</div>
              <div className="mbt">
                <div className="mbf" style={{ width: "96%" }} />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontSize: 9,
                  color: "var(--ember)",
                  width: 26,
                  textAlign: "right",
                }}
              >
                96%
              </span>
            </div>
          </div>
          <div className="vcpc-footer">
            <button type="button" className="btn-save">
              ♡ Save
            </button>
            <button type="button" className="btn-connect">
              Request Intro →
            </button>
          </div>
        </div>
        {onSignOut && (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="ob-cta"
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.12)" }}
              onClick={() => void onSignOut()}
            >
              Sign out
            </button>
          </div>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

const INBOX_AV_GRADS = [
  "linear-gradient(135deg,#e5431a,#c8a44a)",
  "linear-gradient(135deg,#5a8a6a,#2d7b2d)",
  "linear-gradient(135deg,#1a6fa8,#00c4ff)",
] as const;

function inboxBubbleTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchInboxList(): Promise<InboxPreview[]> {
  const res = await fetch("/api/inbox/conversations", { credentials: "same-origin", cache: "no-store" });
  const data = (await res.json()) as { conversations?: InboxPreview[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  return data.conversations ?? [];
}

export function InboxScreen({
  firstName,
  userId,
  focusConversationId,
  onFocusConversationHandled,
}: {
  firstName: string;
  userId: string;
  focusConversationId?: string | null;
  onFocusConversationHandled?: () => void;
}) {
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";
  const [rows, setRows] = useState<InboxPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const composeRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setComposeDraft("");
    setSendErr(null);
    if (!openThreadId) return;
    const t = window.setTimeout(() => {
      composeRef.current?.focus();
      composeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [openThreadId]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    setSeedHint(null);

    void (async () => {
      try {
        let list = await fetchInboxList();
        if (!cancelled && list.length === 0) {
          const seed = await fetch("/api/inbox/ensure-demo-thread", {
            method: "POST",
            credentials: "same-origin",
          });
          const body = (await seed.json()) as { error?: string; hint?: string };
          if (seed.ok) {
            list = await fetchInboxList();
          } else if (!cancelled) {
            const line = [body.error, body.hint].filter(Boolean).join(" ");
            setSeedHint(line || `Could not create sample thread (${seed.status}).`);
          }
        }
        if (!cancelled) setRows(list);
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Could not load inbox.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!focusConversationId || loading) return;
    const hit = rows.some((r) => r.conversationId === focusConversationId);
    if (hit) {
      setOpenThreadId(focusConversationId);
    }
    onFocusConversationHandled?.();
  }, [focusConversationId, loading, rows, onFocusConversationHandled]);

  const trySampleThread = () => {
    setSeedBusy(true);
    setSeedHint(null);
    void (async () => {
      try {
        let list = await fetchInboxList();
        if (list.length === 0) {
          const seed = await fetch("/api/inbox/ensure-demo-thread", {
            method: "POST",
            credentials: "same-origin",
          });
          const body = (await seed.json()) as { error?: string; hint?: string };
          if (seed.ok) {
            list = await fetchInboxList();
          } else {
            setSeedHint([body.error, body.hint].filter(Boolean).join(" ") || `Request failed (${seed.status}).`);
          }
        }
        setRows(list);
      } catch (e: unknown) {
        setLoadErr(e instanceof Error ? e.message : "Could not load inbox.");
      } finally {
        setSeedBusy(false);
      }
    })();
  };

  async function submitInboxMessage(conversationId: string) {
    const text = composeDraft.trim();
    if (!text || sendBusy) return;
    setSendBusy(true);
    setSendErr(null);
    try {
      const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setComposeDraft("");
      const list = await fetchInboxList();
      setRows(list);
    } catch (e: unknown) {
      setSendErr(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <>
      <AppScreenHeader
        firstName={firstName}
        rightSlot={
          <>
            <div className="role-badge">Inbox</div>
            <div className="hdr-avatar">{av}</div>
          </>
        }
      />
      <div className="sa">
        <div className="sec">{loading ? "// Loading conversations…" : "// Active Conversations"}</div>
        {loadErr && (
          <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 12 }}>{loadErr}</p>
        )}
        {!loading &&
          rows.map((row, i) => {
            const expanded = openThreadId === row.conversationId;
            return (
              <div key={row.conversationId} className="inbox-conv-wrap">
                <button
                  type="button"
                  className="msg-item"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpenThreadId((id) => (id === row.conversationId ? null : row.conversationId))
                  }
                >
                  <div
                    className="msg-av"
                    style={{ background: INBOX_AV_GRADS[i % INBOX_AV_GRADS.length] }}
                  >
                    {row.avatarLetter}
                  </div>
                  <div className="msg-content">
                    <div className="msg-top">
                      <div className="msg-name">
                        {row.counterpartyName}
                        {row.projectLabel ? ` · ${row.projectLabel}` : ""}
                      </div>
                      <div className="msg-time">{row.timeLabel}</div>
                    </div>
                    <div className="msg-preview">{row.preview}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {row.unread ? <div className="msg-unread" /> : null}
                  </div>
                </button>
                {expanded ? (
                  <div className="inbox-thread" role="region" aria-label={`Messages with ${row.counterpartyName}`}>
                    {row.threadProjectSummary ? (
                      <div className="inbox-thread-project" aria-label="Project for this conversation">
                        <div
                          className="inbox-thread-project-av"
                          style={{ background: "linear-gradient(135deg,#e5431a,#c8a44a)" }}
                        >
                          {row.threadProjectSummary.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="inbox-thread-project-text">
                          <div className="inbox-thread-project-title">{row.threadProjectSummary.title}</div>
                          <div className="inbox-thread-project-sub">{row.threadProjectSummary.detail}</div>
                          <div className="inbox-thread-project-with">With {row.counterpartyName}</div>
                        </div>
                      </div>
                    ) : null}
                    {row.threadMessages.length === 0 ? (
                      <p className="inbox-thread-empty">No messages in this thread yet.</p>
                    ) : (
                      row.threadMessages.map((m, mi) => {
                        const mine = m.sender_id === userId;
                        return (
                          <div
                            key={m.id ?? `${m.created_at}-${mi}`}
                            className={`inbox-bubble${mine ? " inbox-bubble--me" : " inbox-bubble--them"}`}
                          >
                            <p className="inbox-bubble-body">{m.body}</p>
                            <div className="inbox-bubble-meta">{inboxBubbleTime(m.created_at)}</div>
                          </div>
                        );
                      })
                    )}
                    <form
                      className="inbox-compose"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitInboxMessage(row.conversationId);
                      }}
                    >
                      <textarea
                        ref={composeRef}
                        className="inbox-compose-input"
                        rows={2}
                        value={composeDraft}
                        onChange={(e) => {
                          setComposeDraft(e.target.value);
                          setSendErr(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void submitInboxMessage(row.conversationId);
                          }
                        }}
                        placeholder="Write a message…"
                        disabled={sendBusy}
                        aria-label="Message text"
                      />
                      <button
                        type="submit"
                        className="inbox-compose-send"
                        disabled={sendBusy || composeDraft.trim().length === 0}
                      >
                        {sendBusy ? "…" : "Send"}
                      </button>
                    </form>
                    {sendErr ? (
                      <p className="inbox-compose-err" role="alert">
                        {sendErr}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        {!loading && rows.length === 0 && !loadErr && (
          <div style={{ padding: "0 4px" }}>
            <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
              No conversations yet. With your own Google account, run{" "}
              <code style={{ fontSize: 11 }}>supabase/manual/seed_inbox_only_counterparties.sql</code> in the
              Supabase SQL Editor (minimal demo VC + founder), then tap{" "}
              <strong style={{ fontWeight: 600 }}>Create sample thread</strong>. Or use the full feed seed
              migration <code style={{ fontSize: 11 }}>20250406140000_seed_feed_items.sql</code>.
            </p>
            {seedHint ? (
              <p style={{ color: "var(--ember)", fontSize: 11, lineHeight: 1.45, marginBottom: 12 }}>
                {seedHint}
                {seedHint.includes("disabled") ? (
                  <>
                    {" "}
                    Add <code style={{ fontSize: 10 }}>CRUCIBLE_ENABLE_INBOX_DEMO_SEED=true</code> to{" "}
                    <code style={{ fontSize: 10 }}>.env.local</code> if you are not running{" "}
                    <code style={{ fontSize: 10 }}>next dev</code>.
                  </>
                ) : null}
              </p>
            ) : null}
            <button
              type="button"
              className="ob-cta"
              style={{
                width: "100%",
                maxWidth: 280,
                background: "transparent",
                border: "1px solid rgba(255,255,255,.18)",
                fontSize: 12,
              }}
              disabled={seedBusy}
              onClick={() => trySampleThread()}
            >
              {seedBusy ? "Working…" : "Create sample thread"}
            </button>
          </div>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}
