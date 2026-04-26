"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getFirstNameFromUser } from "@/lib/auth/displayName";
import { getEmailLoginAllowlist, isEmailLoginAllowed } from "@/lib/auth/emailLoginAllowlist";
import { setPendingRole, syncProfileRoleAfterOAuth } from "@/lib/auth/profile";
import { fetchFounderProject, founderNeedsOnboarding } from "@/lib/data/onboarding";
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
import { LiveBeIndicator } from "./LiveBeIndicator";

function supabaseEnvConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function CrucibleApp() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error") === "1";
  const envMissing = !supabaseEnvConfigured();

  const [phase, setPhase] = useState<Phase>(() => (envMissing ? "role" : "loading"));
  const [role, setRole] = useState<Role>("founder");
  const [tab, setTab] = useState<Tab>("feed");
  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthStartError, setOauthStartError] = useState<string | null>(null);
  const [emailSignInBusy, setEmailSignInBusy] = useState(false);
  const [emailSignInError, setEmailSignInError] = useState<string | null>(null);
  const emailLoginAllowlist = useMemo(() => getEmailLoginAllowlist(), []);
  const [addProjectKey, setAddProjectKey] = useState(0);
  const [feedRefreshNonce, setFeedRefreshNonce] = useState(0);
  /** Opens Inbox on this conversation after creating/fetching thread from Matches. */
  const [inboxFocusConversationId, setInboxFocusConversationId] = useState<string | null>(null);
  /** After +Project save, return here instead of defaulting to Profile (founder). */
  const tabBeforeAddProjectRef = useRef<Tab | null>(null);

  const loadAppState = useCallback(async (supabase: SupabaseClient, sess: Session) => {
    const user = sess.user;
    const metaName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null;
    const avatar =
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === "string"
          ? user.user_metadata.picture
          : null;

    await syncProfileRoleAfterOAuth(supabase, user.id, user.email ?? undefined, metaName, avatar);

    const { data: profile } = await supabase.from("profiles").select("id,role").eq("id", user.id).maybeSingle();

    if (!profile) {
      setPhase("role");
      setSession(null);
      return;
    }

    if (profile.role === "founder") {
      const proj = await fetchFounderProject(supabase, user.id);
      if (founderNeedsOnboarding(proj)) {
        setPhase("onboard-founder");
        setRole("founder");
        setSession(sess);
        return;
      }
    } else {
      const { data: vc } = await supabase
        .from("vc_profiles")
        .select("investment_thesis")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!vc?.investment_thesis?.trim()) {
        setPhase("onboard-investor");
        setRole("vc");
        setSession(sess);
        return;
      }
    }

    setRole(profile.role === "investor" ? "vc" : "founder");
    setSession(sess);
    setPhase("app");
    setTab("feed");
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "TOKEN_REFRESHED") return;
      if (!nextSession) {
        setPhase("role");
        setSession(null);
        return;
      }
      void loadAppState(supabase, nextSession);
    });

    return () => subscription.unsubscribe();
  }, [loadAppState]);

  const signInWithGoogle = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setPendingRole(role);
    setOauthStartError(null);
    setOauthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid email profile",
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error(error);
      setOauthStartError(error.message);
      setOauthBusy(false);
      return;
    }
    // Success: full-page redirect to Google; leave oauthBusy true until unload.
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const normalized = email.trim().toLowerCase();
    setEmailSignInError(null);
    setOauthStartError(null);
    if (!normalized || !password) {
      setEmailSignInError("Enter email and password.");
      return;
    }
    if (!isEmailLoginAllowed(normalized, emailLoginAllowlist)) {
      setEmailSignInError("This email is not in NEXT_PUBLIC_CRUCIBLE_EMAIL_LOGIN_ALLOWLIST.");
      return;
    }
    setPendingRole(role);
    setEmailSignInBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      if (error) {
        setEmailSignInError(error.message);
        return;
      }
      // onAuthStateChange → loadAppState
    } finally {
      setEmailSignInBusy(false);
    }
  };

  const handleOnboardingComplete = async () => {
    const returnTab = tabBeforeAddProjectRef.current;
    tabBeforeAddProjectRef.current = null;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setPhase("app");
      setTab(returnTab ?? "feed");
      return;
    }
    const {
      data: { session: next },
    } = await supabase.auth.getSession();
    if (next) {
      await loadAppState(supabase, next);
      if (returnTab) setTab(returnTab);
    }
  };

  const handleSkipOnboarding = () => {
    setPhase("app");
    setTab("feed");
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    setPhase("role");
    setSession(null);
  };

  const switchTab = (key: Tab) => setTab(key);

  const openAddProject = () => {
    tabBeforeAddProjectRef.current = tab;
    setAddProjectKey((k) => k + 1);
    setPhase("add-project");
  };

  const user = session?.user;
  const displayEmail = user?.email ?? "";
  const firstName = getFirstNameFromUser(user ?? undefined);
  const avatarLetter =
    firstName !== "there" && firstName
      ? firstName.charAt(0).toUpperCase()
      : displayEmail.length > 0
        ? displayEmail[0].toUpperCase()
        : "?";

  return (
    <div className="shell">
      {phase !== "loading" ? <LiveBeIndicator /> : null}
      {phase === "loading" && (
        <div className="screen active" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
        </div>
      )}

      {phase === "role" && (
        <RoleSelectScreen
          selected={role}
          onSelect={setRole}
          onContinueWithGoogle={signInWithGoogle}
          envMissing={envMissing}
          authError={authError}
          oauthBusy={oauthBusy}
          oauthStartError={oauthStartError}
          emailLoginAllowlist={emailLoginAllowlist}
          onEmailPasswordSignIn={(e, p) => void signInWithEmailPassword(e, p)}
          emailSignInBusy={emailSignInBusy}
          emailSignInError={emailSignInError}
        />
      )}

      {phase === "onboard-founder" && session && (
        <FounderOnboarding userId={session.user.id} onSkip={handleSkipOnboarding} onComplete={handleOnboardingComplete} />
      )}

      {phase === "add-project" && session && (
        <FounderOnboarding
          key={addProjectKey}
          variant="addProject"
          userId={session.user.id}
          onSkip={() => {
            tabBeforeAddProjectRef.current = null;
            setPhase("app");
            setTab("feed");
          }}
          onComplete={handleOnboardingComplete}
        />
      )}

      {phase === "onboard-investor" && session && (
        <InvestorOnboarding userId={session.user.id} onSkip={handleSkipOnboarding} onComplete={handleOnboardingComplete} />
      )}

      {phase === "app" && session && (
        <>
          <div className={`screen${tab === "feed" ? " active" : ""}`}>
            <FeedScreen
              role={role}
              firstName={firstName}
              userId={session.user.id}
              onOpenModal={() => setModalOpen(true)}
              feedRefreshNonce={feedRefreshNonce}
            />
          </div>

          <div className={`screen${tab === "dash" ? " active" : ""}`}>
            <MatchesScreen
              firstName={firstName}
              userId={session.user.id}
              viewerRole={role}
              onOpenInboxThread={(conversationId) => {
                setInboxFocusConversationId(conversationId);
                setTab("msg");
              }}
            />
          </div>

          <div className={`screen${tab === "quiz" ? " active" : ""}`}>
            <RecordScreen
              userId={session.user.id}
              onGoProfile={() => switchTab("founder")}
              firstName={firstName}
              onPublishedToFeed={() => setFeedRefreshNonce((n) => n + 1)}
              onAddProject={role === "founder" ? openAddProject : undefined}
            />
          </div>

          <div className={`screen${tab === "founder" ? " active" : ""}`}>
            <ProfileScreen
              onNewVideo={() => switchTab("quiz")}
              onSignOut={handleSignOut}
              firstName={firstName}
              avatarLabel={avatarLetter}
              profileRoleLabel={role === "founder" ? "Founder" : "Investor"}
              onAddProject={role === "founder" ? openAddProject : undefined}
            />
          </div>

          <div className={`screen${tab === "msg" ? " active" : ""}`}>
            {tab === "msg" ? (
              <InboxScreen
                key={session.user.id}
                firstName={firstName}
                userId={session.user.id}
                focusConversationId={inboxFocusConversationId}
                onFocusConversationHandled={() => setInboxFocusConversationId(null)}
              />
            ) : null}
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
