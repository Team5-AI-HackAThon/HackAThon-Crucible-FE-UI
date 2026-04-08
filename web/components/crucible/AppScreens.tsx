"use client";

import type { Role } from "./types";
import { useEffect, useState, type FormEvent } from "react";
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
import { fetchInboxPreviews, type InboxPreview } from "@/lib/data/inbox";
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

export function FeedScreen({ role, onOpenModal, firstName, userId }: FeedProps) {
  const [chip, setChip] = useState(0);
  const [items, setItems] = useState<FeedItemRowWithPlayback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [feedKey, setFeedKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const badge = role === "founder" ? "Founder View" : "VC View";
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";

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
  }, [userId, feedKey]);

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

export function MatchesScreen({ firstName }: { firstName: string }) {
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";
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
            Maya Chen
            <br />
            <em>Partner · Sequoia</em>
          </div>
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
        <div className="sec">{"// Top Matches For You"}</div>
        <div className="match-card">
          <div className="mc-top">
            <div className="mc-avatar" style={{ background: "linear-gradient(135deg,#e5431a,#c8a44a)" }}>
              V
            </div>
            <div className="mc-info">
              <div className="mc-name">Vanta AI</div>
              <div className="mc-sub">Jake Torres · CEO · Seed · $2.4M</div>
            </div>
            <div className="mc-score-pill score-green">94%</div>
          </div>
          <div className="mc-bars">
            <div className="mc-bar-row">
              <div className="mc-bar-lbl">Thesis Fit</div>
              <div className="mc-bar-track">
                <div className="mc-bar-fill" style={{ width: "96%", background: "var(--sage)" }} />
              </div>
            </div>
            <div className="mc-bar-row">
              <div className="mc-bar-lbl">Stage</div>
              <div className="mc-bar-track">
                <div className="mc-bar-fill" style={{ width: "92%", background: "var(--sage)" }} />
              </div>
            </div>
          </div>
          <div className="mc-sent-row">
            <div className="sent-badge sent-lead">⚡ Clear Leadership</div>
            <div className="sent-badge sent-energy">🔆 High Energy</div>
          </div>
          <div className="mc-actions">
            <button type="button" className="act-btn act-interested">
              ✓ Interested
            </button>
            <button type="button" className="act-btn act-pass">
              ✕ Pass
            </button>
            <button type="button" className="act-btn act-save">
              ♡ Save
            </button>
          </div>
        </div>
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

export function InboxScreen({ firstName, userId }: { firstName: string; userId: string }) {
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";
  const [rows, setRows] = useState<InboxPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    void fetchInboxPreviews(supabase, userId)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Could not load inbox.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
          rows.map((row, i) => (
            <div key={row.conversationId} className="msg-item">
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
            </div>
          ))}
        {!loading && rows.length === 0 && !loadErr && (
          <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
            No conversations yet. After the inbox seed migration, sign in as a feed demo user to see sample
            threads.
          </p>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}
