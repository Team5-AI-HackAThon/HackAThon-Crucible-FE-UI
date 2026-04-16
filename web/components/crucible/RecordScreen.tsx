"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  fetchOwnerMediaWithSignedUrls,
  formatDuration,
  latestSentimentOutput,
  type OwnerMediaWithUrl,
} from "@/lib/data/mediaAssets";
import { parseSubmitAsyncSseData, type SubmitAsyncJson202Response } from "@/lib/sentiment/submitAsyncTypes";
import { getCameraStream, startMediaRecorder } from "@/lib/media/recorder";
import { deleteMediaAsset, type QuizSlug } from "@/lib/media/videoUpload";
import { AppScreenHeader } from "./AppScreenHeader";

function terminalFromStatusPayload(j: Record<string, unknown>): "done" | "failed" | null {
  const job = typeof j.job_status === "string" ? j.job_status : "";
  if (job === "done") return "done";
  if (job === "failed") return "failed";
  if (j.is_processed === true) return "done";
  return null;
}

const QUIZ_PROMPTS = {
  p1: '"Your team is on the 48th floor of the Santander Building, Downtown Dallas. Floors 20–30 are on fire. How do you get out?"',
  p2: '"Your team has landed in Japan to learn Tai-Chi and compete in NYC in 1 week. No prior experience. No contacts. How do you become experts in time?"',
  custom: '"Write your own crisis scenario for your team to respond to together on camera."',
} as const;

type QuizKey = keyof typeof QUIZ_PROMPTS;

const MAX_SECS = 300;

function quizKeyToSlug(key: QuizKey): QuizSlug {
  if (key === "p1") return "fire_escape";
  if (key === "p2") return "tai_chi_japan";
  return "custom";
}

function templateLabel(key: QuizKey): string {
  if (key === "p1") return "Template · Prompt 1 · Fire";
  if (key === "p2") return "Template · Prompt 2 · Japan";
  return "Custom scenario";
}

function quizSlugLabel(slug: string | null): string {
  if (!slug) return "Recording";
  if (slug === "fire_escape") return "Fire escape";
  if (slug === "tai_chi_japan") return "Tai-Chi Japan";
  if (slug === "custom") return "Custom";
  return slug;
}

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

type AiPhase = "idle" | "loading" | "done";

function MediaThumb({
  item,
  onOpen,
  onLibraryRefresh,
}: {
  item: OwnerMediaWithUrl;
  onOpen: () => void;
  onLibraryRefresh: () => void | Promise<void>;
}) {
  const vref = useRef<HTMLVideoElement>(null);
  const jobDoneRef = useRef(false);
  const initialDone = Boolean(latestSentimentOutput(item)?.is_processed);
  const [aiPhase, setAiPhase] = useState<AiPhase>(initialDone ? "done" : "idle");
  const [aiErr, setAiErr] = useState<string | null>(null);
  /** From `POST /submit-async` 202 `sentiment_output_id` — enables BFF SSE + status poll. */
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const markJobComplete = useCallback(() => {
    if (jobDoneRef.current) return;
    jobDoneRef.current = true;
    setAiPhase("done");
    setActiveJobId(null);
    void onLibraryRefresh();
  }, [onLibraryRefresh]);

  const markJobFailed = useCallback((msg?: string) => {
    if (jobDoneRef.current) return;
    jobDoneRef.current = true;
    setAiPhase("idle");
    setActiveJobId(null);
    setAiErr(msg?.trim() || "Analysis failed.");
  }, []);

  useEffect(() => {
    if (latestSentimentOutput(item)?.is_processed) {
      setAiPhase("done");
    }
  }, [item]);

  useEffect(() => {
    const v = vref.current;
    if (!v || !item.signedUrl) return;
    const onData = () => {
      try {
        v.currentTime = 0.25;
      } catch {
        /* ignore */
      }
    };
    v.addEventListener("loadeddata", onData);
    return () => v.removeEventListener("loadeddata", onData);
  }, [item.signedUrl]);

  useEffect(() => {
    if (aiPhase !== "loading" || !activeJobId) return;
    jobDoneRef.current = false;
    const url = `/api/sentiment/submit-async/events/${encodeURIComponent(activeJobId)}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      const j = parseSubmitAsyncSseData(ev.data);
      if (!j) return;
      if (j.stage === "done") {
        markJobComplete();
        es.close();
      } else if (j.stage === "error") {
        markJobFailed(j.message);
        es.close();
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [aiPhase, activeJobId, markJobComplete, markJobFailed]);

  useEffect(() => {
    if (aiPhase !== "loading" || !activeJobId) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/sentiment/status/${encodeURIComponent(activeJobId)}`, {
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!alive || jobDoneRef.current) return;
        const t = terminalFromStatusPayload(j);
        if (t === "done") {
          markJobComplete();
        } else if (t === "failed") {
          markJobFailed(typeof j.job_error === "string" ? j.job_error : undefined);
        }
      } catch {
        /* keep polling */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 6000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [aiPhase, activeJobId, markJobComplete, markJobFailed]);

  useEffect(() => {
    if (aiPhase !== "loading") return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`sentiment-${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sentiment_outputs",
          filter: `media_asset_id=eq.${item.id}`,
        },
        (payload) => {
          const row = payload.new as { is_processed?: boolean };
          if (row?.is_processed) {
            markJobComplete();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [aiPhase, item.id, markJobComplete]);

  useEffect(() => {
    if (aiPhase !== "loading" || activeJobId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const poll = async () => {
      const { data, error } = await supabase
        .from("sentiment_outputs")
        .select("is_processed")
        .eq("media_asset_id", item.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || jobDoneRef.current) return;
      if (data?.is_processed) {
        markJobComplete();
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(id);
  }, [aiPhase, activeJobId, item.id, markJobComplete]);

  async function onAiClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setAiErr(null);
    if (aiPhase === "loading" || aiPhase === "done") return;
    jobDoneRef.current = false;
    setActiveJobId(null);
    setAiPhase("loading");
    try {
      const res = await fetch("/api/sentiment/submit-media-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ media_asset_id: item.id }),
      });
      const j = (await res.json().catch(() => ({}))) as SubmitAsyncJson202Response & { error?: string };
      if (!res.ok) {
        setAiPhase("idle");
        setAiErr(typeof j.error === "string" ? j.error : `Request failed (${res.status})`);
        return;
      }
      const sid = typeof j.sentiment_output_id === "string" ? j.sentiment_output_id.trim() : "";
      setActiveJobId(sid || null);
    } catch {
      setAiPhase("idle");
      setAiErr("Could not reach analysis service.");
    }
  }

  return (
    <div className="record-lib-thumb-wrap">
      <button type="button" className="record-lib-thumb" onClick={onOpen}>
        {item.signedUrl ? (
          <video
            ref={vref}
            className="record-lib-thumb-vid"
            src={item.signedUrl}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div
            className="record-lib-thumb-vid"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            …
          </div>
        )}
        <div className="record-lib-thumb-meta">
          <div className={`record-lib-thumb-badge${item.published_at ? "" : " draft"}`}>
            {item.published_at ? "Published" : "Draft"}
          </div>
          <div>
            {formatDuration(item.duration_seconds)} · {quizSlugLabel(item.quiz_template_slug)}
          </div>
        </div>
      </button>
      <button
        type="button"
        className={`record-thumb-ai${aiPhase === "done" ? " record-thumb-ai--done" : ""}${aiPhase === "loading" ? " record-thumb-ai--loading" : ""}`}
        title={
          aiPhase === "done"
            ? "Video intelligence complete"
            : "Run video intelligence (sends media_assets to analysis service)"
        }
        aria-label="Video intelligence"
        onClick={onAiClick}
      >
        {aiPhase === "loading" ? <span className="record-thumb-ai-spin" aria-hidden /> : null}
        {aiPhase === "done" ? (
          <span className="record-thumb-ai-check" aria-hidden>
            {"\u2713"}
          </span>
        ) : null}
        {aiPhase === "idle" ? <span aria-hidden>AI</span> : null}
      </button>
      {aiErr ? (
        <div className="record-thumb-ai-err" title={aiErr}>
          {aiErr.length > 40 ? `${aiErr.slice(0, 40)}…` : aiErr}
        </div>
      ) : null}
    </div>
  );
}

export function RecordScreen({
  onGoProfile,
  firstName,
  userId,
  onPublishedToFeed,
}: {
  onGoProfile: () => void;
  firstName: string;
  userId: string;
  /** Called after a clip is added to `feed_items` so the Feed tab can refetch. */
  onPublishedToFeed?: () => void;
}) {
  const [quizKey, setQuizKey] = useState<QuizKey>("p1");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastMediaId, setLastMediaId] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  /** Set after successful `submit-async`; cleared when job reaches done/failed or user discards. */
  const [sentimentPollId, setSentimentPollId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<OwnerMediaWithUrl[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [reviewItem, setReviewItem] = useState<OwnerMediaWithUrl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const blobPromiseRef = useRef<Promise<Blob> | null>(null);

  const promptText = QUIZ_PROMPTS[quizKey];
  const fillPct = Math.min(100, (secs / MAX_SECS) * 100);
  const av = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : "?";

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) return;
    void supabase
      .from("projects")
      .select("id")
      .eq("founder_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectId(data?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadLibrary = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLibraryItems([]);
      setLibraryLoading(false);
      return;
    }
    setLibraryLoading(true);
    try {
      const rows = await fetchOwnerMediaWithSignedUrls(supabase, userId);
      setLibraryItems(rows);
    } catch {
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary, libraryVersion]);

  useEffect(() => {
    if (!sentimentPollId) return;
    let alive = true;
    let intervalId: number | undefined;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sentiment/status/${encodeURIComponent(sentimentPollId)}`, {
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as {
          job_status?: string;
          job_error?: string;
          error?: string;
        };
        if (!alive) return;
        if (!res.ok) {
          setAnalysisErr(typeof j.error === "string" ? j.error : "Could not load analysis status.");
          setSentimentPollId(null);
          return;
        }
        const job = typeof j.job_status === "string" ? j.job_status : "";
        setAnalysisStatus(job || null);
        if (job === "failed" && typeof j.job_error === "string" && j.job_error.trim()) {
          setAnalysisErr(j.job_error.trim());
        } else if (job !== "failed") {
          setAnalysisErr(null);
        }
        if (job === "done" || job === "failed") {
          setSentimentPollId(null);
        }
      } catch {
        if (alive) {
          setAnalysisErr("Analysis status unreachable.");
          setSentimentPollId(null);
        }
      }
    };

    void poll();
    intervalId = window.setInterval(() => void poll(), 5000);
    return () => {
      alive = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [sentimentPollId]);

  useEffect(() => {
    if (!sentimentPollId) return;
    const url = `/api/sentiment/submit-async/events/${encodeURIComponent(sentimentPollId)}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      const j = parseSubmitAsyncSseData(ev.data);
      if (!j) return;
      if (j.stage === "done") {
        setAnalysisStatus("done");
        setAnalysisErr(null);
        setSentimentPollId(null);
        es.close();
      } else if (j.stage === "error") {
        setAnalysisErr(j.message || "Analysis failed.");
        setSentimentPollId(null);
        es.close();
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [sentimentPollId]);

  useEffect(() => {
    const v = liveVideoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    void v.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    if (!recordedBlob) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => {
      setSecs((s) => (s >= MAX_SECS ? s : s + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    r.stop();
    recorderRef.current = null;
    setIsRecording(false);
    const p = blobPromiseRef.current;
    blobPromiseRef.current = null;
    if (!p) return;
    try {
      const blob = await p;
      setRecordedBlob(blob);
    } catch {
      setUploadErr("Could not finalize recording.");
    }
  }, []);

  useEffect(() => {
    if (isRecording && secs >= MAX_SECS) void stopRecording();
  }, [isRecording, secs, stopRecording]);

  async function turnOnCamera() {
    setCameraError(null);
    setRecordedBlob(null);
    try {
      const s = await getCameraStream();
      setStream(s);
    } catch (e) {
      setCameraError(e instanceof Error ? e.message : "Could not access camera.");
    }
  }

  function turnOffCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setRecordedBlob(null);
    setLastMediaId(null);
    setPublished(false);
    setUploadErr(null);
    setSentimentPollId(null);
    setAnalysisStatus(null);
    setAnalysisErr(null);
    setSecs(0);
  }

  function discardRecording() {
    setRecordedBlob(null);
    setSecs(0);
    setLastMediaId(null);
    setPublished(false);
    setUploadErr(null);
    setSentimentPollId(null);
    setAnalysisStatus(null);
    setAnalysisErr(null);
  }

  function startRecording() {
    if (!stream || typeof MediaRecorder === "undefined") {
      setUploadErr("Video recording is not supported in this browser.");
      return;
    }
    setRecordedBlob(null);
    setLastMediaId(null);
    setPublished(false);
    setUploadErr(null);
    setSentimentPollId(null);
    setAnalysisStatus(null);
    setAnalysisErr(null);
    setSecs(0);
    const { recorder, blobPromise } = startMediaRecorder(stream);
    recorderRef.current = recorder;
    blobPromiseRef.current = blobPromise;
    setIsRecording(true);
  }

  async function uploadClip() {
    const supabase = getSupabaseBrowser();
    if (!supabase || !recordedBlob) {
      setUploadErr("Not signed in or no recording.");
      return;
    }
    setUploading(true);
    setUploadErr(null);
    setAnalysisErr(null);
    setAnalysisStatus(null);
    setSentimentPollId(null);
    try {
      const ext = recordedBlob.type.includes("webm")
        ? "webm"
        : recordedBlob.type.includes("mp4")
          ? "mp4"
          : "webm";
      const fd = new FormData();
      fd.append(
        "file",
        new File([recordedBlob], `recording.${ext}`, {
          type: recordedBlob.type || "video/webm",
        }),
      );
      if (projectId) fd.append("project_id", projectId);
      fd.append("media_kind", "video");

      const res = await fetch("/api/sentiment/submit-async", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        media_asset_id?: string;
        sentiment_output_id?: string;
        job_status?: string;
      };

      if (!res.ok) {
        setUploadErr(typeof j.error === "string" ? j.error : "Upload to analysis service failed.");
        return;
      }

      const mediaId = j.media_asset_id;
      const sentimentId = j.sentiment_output_id;
      if (!mediaId || !sentimentId) {
        setUploadErr("Unexpected response from analysis service.");
        return;
      }

      setLastMediaId(mediaId);
      setSentimentPollId(sentimentId);
      setAnalysisStatus(typeof j.job_status === "string" ? j.job_status : "queued");

      const dur = Math.round(Math.min(secs, MAX_SECS) || 1);
      const { error: patchErr } = await supabase
        .from("media_assets")
        .update({
          quiz_template_slug: quizKeyToSlug(quizKey),
          duration_seconds: dur,
          metadata: { source: "record_tab_web", sentiment_async: true },
        })
        .eq("id", mediaId)
        .eq("owner_id", userId);

      if (patchErr) {
        console.warn("uploadClip: metadata patch", patchErr);
      }

      setLibraryVersion((v) => v + 1);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitToFeed() {
    if (!lastMediaId) return;
    if (!projectId) {
      setUploadErr("Create a project on Profile first — the feed needs a company to attach this clip to.");
      return;
    }
    setUploading(true);
    setUploadErr(null);
    try {
      const res = await fetch("/api/feed/from-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId: lastMediaId, projectId }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; alreadyOnFeed?: boolean };
      if (!res.ok) {
        setUploadErr(typeof j.error === "string" ? j.error : "Could not add to feed.");
        return;
      }
      setPublished(true);
      setLibraryVersion((v) => v + 1);
      onPublishedToFeed?.();
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDeleteReviewed() {
    if (!reviewItem) return;
    if (!window.confirm("Delete this recording? This cannot be undone.")) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setDeletingId(reviewItem.id);
    setUploadErr(null);
    try {
      await deleteMediaAsset(supabase, {
        id: reviewItem.id,
        storage_bucket: reviewItem.storage_bucket,
        storage_path: reviewItem.storage_path,
      });
      if (lastMediaId === reviewItem.id) {
        setLastMediaId(null);
        setPublished(false);
      }
      setReviewItem(null);
      setLibraryVersion((v) => v + 1);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  }

  const canRecord = stream && !isRecording && !recordedBlob;
  const showLive = stream && !recordedBlob;
  const cameraOffPlaceholder = !stream && !recordedBlob;
  const isMobileViewport = useMatchMedia("(max-width: 768px)");

  const recordShellClass = [
    "record-video-shell",
    cameraOffPlaceholder
      ? "record-video-shell--idle"
      : isMobileViewport
        ? "record-video-shell--live-mobile"
        : "record-video-shell--live-desktop",
  ].join(" ");

  return (
    <div style={{ background: "#050505", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <AppScreenHeader
        firstName={firstName}
        hdrStyle={{ background: "#050505", borderColor: "#111" }}
        rightSlot={
          <>
            <div className="role-badge">{isRecording ? "● REC" : "Record"}</div>
            <div className="hdr-avatar" style={{ background: "linear-gradient(135deg,#1a6fa8,#00c4ff)" }}>
              {av}
            </div>
          </>
        }
      />
      <div className="quiz-sel">
        {(["p1", "p2", "custom"] as const).map((k) => (
          <div
            key={k}
            className={`qsel-btn${quizKey === k ? " active" : ""}`}
            onClick={() => !isRecording && setQuizKey(k)}
            role="button"
            style={{ opacity: isRecording ? 0.5 : 1, pointerEvents: isRecording ? "none" : "auto" }}
          >
            {k === "p1" && "Prompt 1 · Fire Escape"}
            {k === "p2" && "Prompt 2 · Tai-Chi Japan"}
            {k === "custom" && "+ Custom"}
          </div>
        ))}
      </div>
      <div className="quiz-prompt-block">
        <div className="qpb-bg">🔥</div>
        <div className="qpb-tag">
          <div className="live-dot" style={{ display: "inline-block", verticalAlign: "middle" }} />
          &nbsp; Active Scenario
        </div>
        <div className="qpb-title">{promptText}</div>
        <div className="qpb-meta">
          <div className="qpb-template">{templateLabel(quizKey)}</div>
          <div className="qpb-timer">05:00 max</div>
        </div>
      </div>
      <div className="sa" style={{ flex: 1, minHeight: 0 }}>
        <div className="sec">{"// Your recordings"}</div>
        {libraryLoading && (
          <p style={{ color: "var(--muted)", fontSize: 12, padding: "0 20px 12px" }}>Loading library…</p>
        )}
        {!libraryLoading && libraryItems.length === 0 && (
          <p style={{ color: "var(--muted2)", fontSize: 12, padding: "0 20px 14px", lineHeight: 1.5 }}>
            No uploads yet. Record below, then upload to save a clip here.
          </p>
        )}
        {!libraryLoading && libraryItems.length > 0 && (
          <div className="record-lib-grid" style={{ padding: "0 20px" }}>
            {libraryItems.map((item) => (
              <MediaThumb
                key={item.id}
                item={item}
                onOpen={() => setReviewItem(item)}
                onLibraryRefresh={loadLibrary}
              />
            ))}
          </div>
        )}

        <div className="sec">{"// New take"}</div>
        {cameraError && (
          <p style={{ color: "var(--ember)", fontSize: 12, marginBottom: 10 }}>{cameraError}</p>
        )}
        {uploadErr && (
          <p style={{ color: "var(--ember)", fontSize: 12, marginBottom: 10 }}>{uploadErr}</p>
        )}
        {(analysisStatus || analysisErr) && (
          <p
            style={{
              color:
                analysisStatus === "done"
                  ? "var(--sage)"
                  : analysisErr || analysisStatus === "failed"
                    ? "var(--ember)"
                    : "var(--muted)",
              fontSize: 12,
              marginBottom: 10,
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: "var(--paper)" }}>Video intelligence</strong>
            {analysisStatus ? ` · ${analysisStatus}` : ""}
            {analysisErr ? ` — ${analysisErr}` : ""}
          </p>
        )}

        <div
          className={recordShellClass}
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: "#111",
            position: "relative",
          }}
        >
          {previewUrl && recordedBlob ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="record-preview-video"
            />
          ) : (
            <video
              ref={liveVideoRef}
              playsInline
              muted
              className="record-live-video"
              style={{
                display: showLive ? "block" : "none",
              }}
            />
          )}
          {cameraOffPlaceholder && (
            <div className="record-camera-off-hint" role="status">
              Camera off — tap below to preview and record.
            </div>
          )}
        </div>

        {!stream && (
          <button type="button" className="submit-btn" style={{ width: "100%", marginBottom: 12 }} onClick={() => void turnOnCamera()}>
            Turn on camera
          </button>
        )}
        {stream && !recordedBlob && (
          <button
            type="button"
            className="ob-cta"
            style={{ width: "100%", marginBottom: 12, background: "transparent", border: "1px solid rgba(255,255,255,.12)" }}
            onClick={turnOffCamera}
          >
            Turn off camera
          </button>
        )}

        <div className="rec-section">
          <div className="rec-track">
            <div className="rec-fill" style={{ width: `${fillPct}%` }} />
          </div>
          <div className="rec-times">
            <div className="rec-el">
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
            </div>
            <div className="rec-mx">5:00 max</div>
          </div>
        </div>
        <div className="rec-controls">
          <div className="ctrl">🔇</div>
          <button
            type="button"
            className="rec-stop"
            onClick={() => {
              if (isRecording) void stopRecording();
              else if (canRecord) startRecording();
            }}
            disabled={!canRecord && !isRecording}
            style={{
              background: isRecording ? "var(--ember)" : canRecord ? "#2a2a2a" : "#1a1a1a",
              opacity: !canRecord && !isRecording ? 0.4 : 1,
            }}
          >
            {isRecording ? "⏹ Stop" : "● Record"}
          </button>
          <div className="ctrl">📷</div>
        </div>

        {recordedBlob && !lastMediaId && (
          <>
            <div className="submit-wrap">
              <button type="button" className="submit-btn" disabled={uploading} onClick={() => void uploadClip()}>
                {uploading ? "Uploading…" : "Upload recording"}
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="ob-cta"
                style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.12)" }}
                disabled={uploading}
                onClick={discardRecording}
              >
                Discard &amp; re-record
              </button>
            </div>
          </>
        )}

        {lastMediaId && !published && (
          <div className="submit-wrap">
            <button type="button" className="submit-btn" disabled={uploading} onClick={() => void submitToFeed()}>
              {uploading ? "Publishing…" : "Submit to Feed →"}
            </button>
          </div>
        )}

        {published && (
          <p style={{ color: "var(--sage)", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
            Published to your feed.
          </p>
        )}

        <div className="submit-wrap">
          <button type="button" className="ob-cta" style={{ width: "100%" }} onClick={onGoProfile}>
            Go to profile
          </button>
        </div>

        <div className="sec">{"// Coaching Tips"}</div>
        <div className="tips-row">
          <div className="tip">
            <div className="tip-icon">💡</div>
            <div className="tip-txt">Let all members speak — VCs look for collaboration, not just the CEO.</div>
          </div>
          <div className="tip">
            <div className="tip-icon">📍</div>
            <div className="tip-txt">Use location details. Noticing specifics signals strategic thinking.</div>
          </div>
        </div>
        <div className="spacer" />
      </div>

      <div
        className={`modal-overlay record-review-overlay${reviewItem ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setReviewItem(null);
        }}
        role="presentation"
      >
        {reviewItem && (
          <div className="record-review-modal-frame" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet record-review-sheet">
              <div className="modal-handle" />
              <div className="modal-body record-review-body">
                <div className="record-review-meta">
                  {reviewItem.published_at ? "Published" : "Draft"} · {formatDuration(reviewItem.duration_seconds)} ·{" "}
                  {quizSlugLabel(reviewItem.quiz_template_slug)}
                </div>
                {reviewItem.signedUrl ? (
                  <div className="record-review-vid-wrap">
                    <video
                      key={reviewItem.id}
                      src={reviewItem.signedUrl}
                      controls
                      playsInline
                      className="record-review-vid"
                    />
                  </div>
                ) : (
                  <p style={{ color: "var(--ember)", fontSize: 13 }}>Could not load video URL.</p>
                )}
              </div>
              <div className="record-review-actions">
              <button type="button" className="btn-keep" onClick={() => setReviewItem(null)}>
                Keep
              </button>
              <button
                type="button"
                className="btn-delete"
                disabled={deletingId === reviewItem.id}
                onClick={() => void confirmDeleteReviewed()}
              >
                {deletingId === reviewItem.id ? "Deleting…" : "Delete"}
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
