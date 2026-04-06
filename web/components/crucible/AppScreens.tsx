"use client";

import type { Role } from "./types";
import { useEffect, useState } from "react";

const FEED_CHIPS = ["All", "🔥 Trending", "Seed", "AI / ML", "Climate"] as const;
const FOUNDER_CHIPS = ["Browse VCs", "My Videos", "Saved", "Intros"] as const;

type FeedProps = {
  role: Role;
  onOpenModal: () => void;
};

export function FeedScreen({ role, onOpenModal }: FeedProps) {
  const [chip, setChip] = useState(0);
  const badge = role === "founder" ? "Founder View" : "VC View";

  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <div className="logo">
            Cruc<span>ible</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="role-badge">{badge}</div>
            <div className="hdr-avatar">M</div>
          </div>
        </div>
      </div>
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
      <div className="sa">
        <div className="live-banner">
          <div className="lb-left">
            <div className="lb-tag">
              <div className="live-dot" style={{ display: "inline-block", verticalAlign: "middle" }} />
              &nbsp;Live Scenario
            </div>
            <div className="lb-text">
              &quot;48th floor, Santander Building, Dallas. Floors 20–30 on fire.&quot;
            </div>
          </div>
          <div className="lb-right">
            <div className="lb-num">62</div>
            <div className="lb-sub">recording</div>
          </div>
        </div>
        <div className="sec">{"// New Submissions · 247 this week"}</div>
        <FeedCard g="g1" match="94%" onOpen={onOpenModal} />
        <FeedCard g="g2" match="88%" onOpen={onOpenModal} />
        <div className="spacer" />
      </div>
    </>
  );
}

function FeedCard({
  g,
  match,
  onOpen,
}: {
  g: string;
  match: string;
  onOpen: () => void;
}) {
  const [acts, setActs] = useState({ interested: false, pass: false, save: false });

  return (
    <div className="vcard" onClick={onOpen}>
      <div className="vthumb">
        <div className={`vthumb-bg ${g}`} />
        <div className="vthumb-grain" />
        <div className="vplay">
          <div className="play-c">▶</div>
          <div className="vdur">2:47</div>
        </div>
        <div className="vfaces">
          <div className="vface fa">J</div>
          <div className="vface fb">A</div>
          <div className="vface fc">R</div>
        </div>
        <div className="vmatch">{match} match</div>
      </div>
      <div className="sent-row">
        <div className="sent-badge sent-lead">⚡ Clear Leadership</div>
        <div className="sent-badge sent-energy">🔆 High Energy</div>
        <div className="sent-badge sent-comm">🗣 Strong Comm.</div>
      </div>
      <div className="cbody">
        <div className="cscen">🔥 Prompt 1 — Fire Escape · Dallas</div>
        <div className="cprompt">
          &quot;48th floor. Floors 20–30 on fire. How does your team get out?&quot;
        </div>
        <div className="cco-row">
          <div className="cco-dot d1">V</div>
          <div className="cco-info">
            <div className="cco-name">Vanta AI</div>
            <div className="cco-sub">San Francisco · B2B SaaS · Security</div>
          </div>
          <div className="stage-p">Seed · $2.4M</div>
        </div>
        <div className="ctags">
          <span className="ctag">AI Infra</span>
          <span className="ctag">B2B</span>
          <span className="ctag">3-person team</span>
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

export function MatchesScreen() {
  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <div className="logo">
            Cruc<span>ible</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="role-badge">Matches</div>
            <div className="hdr-avatar">M</div>
          </div>
        </div>
      </div>
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

const QUIZ_PROMPTS: Record<string, string> = {
  p1: '"Your team is on the 48th floor of the Santander Building, Downtown Dallas. Floors 20–30 are on fire. How do you get out?"',
  p2: '"Your team has landed in Japan to learn Tai-Chi and compete in NYC in 1 week. No prior experience. No contacts. How do you become experts in time?"',
  custom: '"Write your own crisis scenario for your team to respond to together on camera."',
};

export function RecordScreen({ onGoProfile }: { onGoProfile: () => void }) {
  const [quizKey, setQuizKey] = useState<keyof typeof QUIZ_PROMPTS>("p1");
  const [recording, setRecording] = useState(true);
  const [secs, setSecs] = useState(126);

  const promptText = QUIZ_PROMPTS[quizKey];
  const fillPct = Math.min(100, (secs / 300) * 100);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      setSecs((s) => (s >= 300 ? s : s + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [recording]);

  return (
    <div style={{ background: "#050505", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="hdr" style={{ background: "#050505", borderColor: "#111" }}>
        <div className="hdr-top">
          <div className="logo">
            Cruc<span>ible</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="role-badge">● REC</div>
            <div
              className="hdr-avatar"
              style={{ background: "linear-gradient(135deg,#1a6fa8,#00c4ff)" }}
            >
              J
            </div>
          </div>
        </div>
      </div>
      <div className="quiz-sel">
        {(["p1", "p2", "custom"] as const).map((k) => (
          <div
            key={k}
            className={`qsel-btn${quizKey === k ? " active" : ""}`}
            onClick={() => setQuizKey(k)}
            role="button"
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
          <div className="qpb-template">Template · Prompt 1</div>
          <div className="qpb-timer">05:00 max</div>
        </div>
      </div>
      <div className="sa" style={{ flex: 1, minHeight: 0 }}>
        <div className="cam-grid">
          <div className="cam speaking">
            <div className="cam-live">● Live</div>
            <div className="cam-av" style={{ background: "linear-gradient(135deg,#e5431a,#c8a44a)" }}>
              J
            </div>
            <div className="cam-name">Jake · CEO</div>
            <div className="cam-mic">🎙</div>
          </div>
          <div className="cam">
            <div className="cam-live" style={{ background: "#1a1a1a", color: "#444" }}>
              ● Live
            </div>
            <div className="cam-av" style={{ background: "linear-gradient(135deg,#1a6fa8,#00c4ff)" }}>
              A
            </div>
            <div className="cam-name">Aya · CTO</div>
            <div className="cam-mic" style={{ opacity: 0.15 }}>
              🎙
            </div>
          </div>
          <div className="cam cam-add">
            <div className="cam-add-icon">＋</div>
            <div className="cam-add-lbl">Add Member</div>
          </div>
          <div className="cam" style={{ borderStyle: "dashed", borderColor: "#161616", opacity: 0.3 }}>
            <div className="cam-add-icon">👤</div>
            <div className="cam-add-lbl">Empty Seat</div>
          </div>
        </div>
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
            onClick={() => setRecording((r) => !r)}
            style={{ background: recording ? "var(--ember)" : "#2a2a2a" }}
          >
            {recording ? "⏹" : "▶"}
          </button>
          <div className="ctrl">📷</div>
        </div>
        <div className="submit-wrap">
          <button type="button" className="submit-btn" onClick={onGoProfile}>
            Submit to Feed →
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
    </div>
  );
}

export function ProfileScreen({
  onNewVideo,
  onSignOut,
  avatarLabel = "J",
  profileRoleLabel = "Founder",
}: {
  onNewVideo: () => void;
  onSignOut?: () => void;
  avatarLabel?: string;
  profileRoleLabel?: string;
}) {
  const [chip, setChip] = useState(0);
  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <div className="logo">
            Cruc<span>ible</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
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
            <div
              className="hdr-avatar"
              style={{ background: "linear-gradient(135deg,#1a6fa8,#00c4ff)" }}
            >
              {avatarLabel}
            </div>
          </div>
        </div>
      </div>
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

export function InboxScreen() {
  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <div className="logo">
            Cruc<span>ible</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="role-badge">Inbox</div>
            <div className="hdr-avatar">M</div>
          </div>
        </div>
      </div>
      <div className="sa">
        <div className="sec">{"// Active Conversations"}</div>
        <div className="msg-item">
          <div className="msg-av" style={{ background: "linear-gradient(135deg,#e5431a,#c8a44a)" }}>
            J
          </div>
          <div className="msg-content">
            <div className="msg-top">
              <div className="msg-name">Jake Torres · Vanta AI</div>
              <div className="msg-time">2m ago</div>
            </div>
            <div className="msg-preview">Thanks for the interest! Happy to schedule a call...</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className="msg-status-pill st-interested">Interested</div>
            <div className="msg-unread" />
          </div>
        </div>
        <div className="msg-item">
          <div className="msg-av" style={{ background: "linear-gradient(135deg,#5a8a6a,#2d7b2d)" }}>
            L
          </div>
          <div className="msg-content">
            <div className="msg-top">
              <div className="msg-name">Lena Park · GreenShift</div>
              <div className="msg-time">1h ago</div>
            </div>
            <div className="msg-preview">We just submitted our Tai-Chi response, would love feedback.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className="msg-status-pill st-saved">Saved</div>
          </div>
        </div>
        <div className="spacer" />
      </div>
    </>
  );
}
