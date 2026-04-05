"use client";

import { useState } from "react";
import {
  FeedScreen,
  InboxScreen,
  MatchesScreen,
  ProfileScreen,
  RecordScreen,
} from "./AppScreens";
import { FounderOnboarding, InvestorOnboarding, RoleSelectScreen } from "./Onboarding";
import type { Phase, Role, Tab } from "./types";
import { VideoModal } from "./VideoModal";

export function CrucibleApp() {
  const [phase, setPhase] = useState<Phase>("role");
  const [role, setRole] = useState<Role>("founder");
  const [tab, setTab] = useState<Tab>("feed");
  const [modalOpen, setModalOpen] = useState(false);

  const finishOnboarding = () => {
    setPhase("app");
    if (role === "founder") setTab("founder");
    else setTab("feed");
  };

  const startOnboarding = () => {
    setPhase(role === "founder" ? "onboard-founder" : "onboard-investor");
  };

  const switchTab = (key: Tab) => setTab(key);

  return (
    <div className="shell">
      <div className="sb">
        <div className="sb-time">9:41</div>
        <div className="sb-icons">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {phase === "role" && (
        <RoleSelectScreen
          selected={role}
          onSelect={setRole}
          onContinue={startOnboarding}
        />
      )}

      {phase === "onboard-founder" && (
        <FounderOnboarding onSkip={finishOnboarding} onComplete={finishOnboarding} />
      )}

      {phase === "onboard-investor" && (
        <InvestorOnboarding onSkip={finishOnboarding} onComplete={finishOnboarding} />
      )}

      {phase === "app" && (
        <>
          <div className={`screen${tab === "feed" ? " active" : ""}`}>
            <FeedScreen role={role} onOpenModal={() => setModalOpen(true)} />
          </div>

          <div className={`screen${tab === "dash" ? " active" : ""}`}>
            <MatchesScreen />
          </div>

          <div className={`screen${tab === "quiz" ? " active" : ""}`}>
            <RecordScreen onGoProfile={() => switchTab("founder")} />
          </div>

          <div className={`screen${tab === "founder" ? " active" : ""}`}>
            <ProfileScreen onNewVideo={() => switchTab("quiz")} />
          </div>

          <div className={`screen${tab === "msg" ? " active" : ""}`}>
            <InboxScreen />
          </div>

          <nav className="bnav">
            <button
              type="button"
              className={`ni ni-feed${tab === "feed" ? " active" : ""}`}
              onClick={() => switchTab("feed")}
            >
              <div className="ni-icon">▶</div>
              <div className="ni-label">Feed</div>
            </button>
            <button
              type="button"
              className={`ni${tab === "dash" ? " active" : ""}`}
              onClick={() => switchTab("dash")}
            >
              <div className="ni-icon">📊</div>
              <div className="ni-label">Matches</div>
            </button>
            <button
              type="button"
              className={`ni${tab === "quiz" ? " active" : ""}`}
              onClick={() => switchTab("quiz")}
            >
              <div className="ni-icon">🎬</div>
              <div className="ni-label">Record</div>
            </button>
            <button
              type="button"
              className={`ni${tab === "msg" ? " active" : ""}`}
              onClick={() => switchTab("msg")}
            >
              <div className="ni-icon">💬</div>
              <div className="ni-label">Inbox</div>
              <div className="ni-badge on" />
            </button>
            <button
              type="button"
              className={`ni${tab === "founder" ? " active" : ""}`}
              onClick={() => switchTab("founder")}
            >
              <div className="ni-icon">👤</div>
              <div className="ni-label">Profile</div>
            </button>
          </nav>
        </>
      )}

      <VideoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
