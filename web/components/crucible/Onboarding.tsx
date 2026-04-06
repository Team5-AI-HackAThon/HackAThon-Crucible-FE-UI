"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fetchIndustries, type IndustryRow } from "@/lib/data/onboarding";

type RoleSelectProps = {
  selected: "founder" | "vc";
  onSelect: (r: "founder" | "vc") => void;
  onContinueWithGoogle: () => void | Promise<void>;
  envMissing?: boolean;
  authError?: boolean;
  oauthBusy?: boolean;
  oauthStartError?: string | null;
};

export function RoleSelectScreen({
  selected,
  onSelect,
  onContinueWithGoogle,
  envMissing,
  authError,
  oauthBusy,
  oauthStartError,
}: RoleSelectProps) {
  return (
    <div className="screen active" id="s-onboard" style={{ justifyContent: "center" }}>
      <div className="sa" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ob-wrap">
          <div className="ob-flame">🔥</div>
          <div className="ob-logo">
            Cruc<span>ible</span>
          </div>
          <div className="ob-sub">{"// Pre-seed & seed · behavioral matching"}</div>
          {envMissing && (
            <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to <code>.env.local</code> (see
              .env.example).
            </p>
          )}
          {authError && (
            <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 16, textAlign: "center" }}>
              Sign-in could not complete. Try again.
            </p>
          )}
          {oauthStartError && (
            <p style={{ color: "var(--ember)", fontSize: 11, marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
              {oauthStartError}
            </p>
          )}
          <div className="ob-q">I am joining as a —</div>
          <div className="ob-roles">
            <div
              className={`ob-role${selected === "founder" ? " sel" : ""}`}
              onClick={() => onSelect("founder")}
              role="button"
            >
              <div className="ob-role-icon">🚀</div>
              <div className="ob-role-name">Founder</div>
              <div className="ob-role-desc">
                Seeking aligned
                <br />
                investors
              </div>
            </div>
            <div
              className={`ob-role${selected === "vc" ? " sel" : ""}`}
              onClick={() => onSelect("vc")}
              role="button"
            >
              <div className="ob-role-icon">💼</div>
              <div className="ob-role-name">Investor</div>
              <div className="ob-role-desc">
                Evaluating
                <br />
                team dynamics
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ob-cta"
            onClick={() => void onContinueWithGoogle()}
            disabled={!!envMissing || !!oauthBusy}
          >
            {oauthBusy ? "Opening Google…" : "Continue with Google →"}
          </button>
          <div className="ob-signin">
            Already have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                void onContinueWithGoogle();
              }}
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const F_LABELS = ["Step 1 of 2 — Startup & industry", "Step 2 of 2 — One-line pitch"];

type FounderProps = {
  userId: string;
  onSkip: () => void;
  onComplete: () => void;
};

export function FounderOnboarding({ userId, onSkip, onComplete }: FounderProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [hq, setHq] = useState("");
  const [pitch, setPitch] = useState("");
  const [industryIds, setIndustryIds] = useState<Set<string>>(new Set());
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pct = (step / 2) * 100;

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    fetchIndustries(supabase).then(setIndustries);
  }, []);

  function toggleIndustry(id: string) {
    setIndustryIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function nextFromStep1() {
    setErr(null);
    if (!name.trim() || !hq.trim()) {
      setErr("Enter startup name and HQ city.");
      return;
    }
    if (industryIds.size === 0) {
      setErr("Select at least one industry.");
      return;
    }
    setStep(2);
  }

  async function complete() {
    setErr(null);
    if (!pitch.trim()) {
      setErr("Enter your one-line pitch.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setErr("Supabase is not configured.");
      return;
    }
    setSaving(true);
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        founder_id: userId,
        name: name.trim(),
        hq_city: hq.trim(),
        one_line_pitch: pitch.trim(),
      })
      .select("id")
      .single();

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    if (project && industryIds.size > 0) {
      const rows = [...industryIds].map((industry_id) => ({
        project_id: project.id,
        industry_id,
      }));
      const { error: e2 } = await supabase.from("project_industries").insert(rows);
      if (e2) {
        setErr(e2.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onComplete();
  }

  return (
    <div className="screen active" id="s-ob-founder">
      <div className="ob-step-hdr">
        <div className="ob-step-logo">
          Cruc<span>ible</span>
        </div>
        <div className="ob-skip" onClick={onSkip} role="button">
          Skip for now
        </div>
      </div>
      <div className="ob-progress">
        <div className="ob-prog-top">
          <div className="ob-prog-label">{F_LABELS[step - 1]}</div>
          <div className="ob-prog-step">
            {step} / 2
          </div>
        </div>
        <div className="ob-prog-track">
          <div className="ob-prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="ob-steps-wrap">
        <div className="ob-step visible" style={{ position: "relative", inset: "auto", height: "100%" }}>
          {step === 1 && (
            <>
              <div>
                <div className="step-title">
                  Project & <span>startup</span>
                </div>
                <div className="step-sub">Name, HQ, and industries investors care about.</div>
              </div>
              {err && (
                <p style={{ color: "var(--ember)", fontSize: 12, marginBottom: 8 }}>{err}</p>
              )}
              <div className="ob-field">
                <div className="ob-label">Startup name</div>
                <input
                  className="ob-input"
                  placeholder="e.g. Vanta AI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="ob-field">
                <div className="ob-label">HQ city</div>
                <input
                  className="ob-input"
                  placeholder="e.g. San Francisco, CA"
                  value={hq}
                  onChange={(e) => setHq(e.target.value)}
                />
              </div>
              <div className="ob-field">
                <div className="ob-label">Industry / sector</div>
                <div className="ob-options">
                  {industries.length === 0 ? (
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>Loading industries…</span>
                  ) : (
                    industries.map((ind) => (
                      <div
                        key={ind.id}
                        className={`ob-option${industryIds.has(ind.id) ? " sel" : ""}`}
                        onClick={() => toggleIndustry(ind.id)}
                        role="button"
                      >
                        {ind.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <div className="step-title">
                  One-line <span>pitch</span>
                </div>
                <div className="step-sub">How you describe what you&apos;re building.</div>
              </div>
              {err && (
                <p style={{ color: "var(--ember)", fontSize: 12, marginBottom: 8 }}>{err}</p>
              )}
              <div className="ob-field">
                <div className="ob-label">Pitch</div>
                <textarea
                  className="ob-input ob-textarea"
                  placeholder="What are you building?"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="ob-nav-footer">
        <button
          type="button"
          className="ob-back"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          style={{ opacity: step === 1 ? 0.3 : 1, pointerEvents: step === 1 ? "none" : "auto" }}
        >
          ←
        </button>
        <button
          type="button"
          className="ob-next"
          disabled={saving}
          onClick={() => {
            if (step === 1) nextFromStep1();
            else void complete();
          }}
        >
          {step >= 2 ? (saving ? "Saving…" : "Complete Profile →") : "Next →"}
        </button>
      </div>
    </div>
  );
}

const I_LABELS = [
  "Step 1 of 3 — Stage & check size",
  "Step 2 of 3 — Sector focus",
  "Step 3 of 3 — Investment thesis",
];

type InvestorProps = {
  userId: string;
  onSkip: () => void;
  onComplete: () => void;
};

export function InvestorOnboarding({ userId, onSkip, onComplete }: InvestorProps) {
  const [step, setStep] = useState(1);
  const [firmName, setFirmName] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [thesis, setThesis] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pct = (step / 3) * 100;

  const sectorOptions = ["AI / ML", "B2B SaaS", "Climate", "Fintech"];

  function toggleSector(s: string) {
    setSectors((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function saveProfile() {
    setErr(null);
    if (!thesis.trim()) {
      setErr("Add a short investment thesis.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setErr("Supabase is not configured.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vc_profiles").upsert(
      {
        user_id: userId,
        firm_name: firmName.trim() || null,
        interested_areas: sectors,
        investment_thesis: thesis.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onComplete();
  }

  return (
    <div className="screen active" id="s-ob-investor">
      <div className="ob-step-hdr">
        <div className="ob-step-logo">
          Cruc<span>ible</span>
        </div>
        <div className="ob-skip" onClick={onSkip} role="button">
          Skip for now
        </div>
      </div>
      <div className="ob-progress">
        <div className="ob-prog-top">
          <div className="ob-prog-label">{I_LABELS[step - 1]}</div>
          <div className="ob-prog-step">
            {step} / 3
          </div>
        </div>
        <div className="ob-prog-track">
          <div className="ob-prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="ob-steps-wrap">
        <div className="ob-step visible" style={{ position: "relative", inset: "auto", height: "100%" }}>
          {step === 1 && (
            <>
              <div>
                <div className="step-title">
                  Your <span>firm</span>
                </div>
                <div className="step-sub">How founders see you.</div>
              </div>
              <div className="ob-field">
                <div className="ob-label">Firm name (optional)</div>
                <input
                  className="ob-input"
                  placeholder="e.g. Benchmark"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                />
              </div>
              <div className="ob-field">
                <div className="ob-label">Preferred stage</div>
                <div className="stage-grid">
                  <div className="stage-btn sel">
                    <div className="stage-icon">🌿</div>
                    <div className="stage-name">Seed</div>
                  </div>
                  <div className="stage-btn">
                    <div className="stage-icon">🌳</div>
                    <div className="stage-name">Series A</div>
                  </div>
                  <div className="stage-btn">
                    <div className="stage-icon">🌲</div>
                    <div className="stage-name">Growth</div>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <div className="step-title">
                  Sector <span>focus</span>
                </div>
                <div className="step-sub">Where you spend time.</div>
              </div>
              <div className="ob-options">
                {sectorOptions.map((x) => (
                  <div
                    key={x}
                    className={`ob-option${sectors.includes(x) ? " sel" : ""}`}
                    onClick={() => toggleSector(x)}
                    role="button"
                  >
                    {x}
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div>
                <div className="step-title">
                  Investment <span>thesis</span>
                </div>
                <div className="step-sub">What you look for in founders.</div>
              </div>
              {err && (
                <p style={{ color: "var(--ember)", fontSize: 12, marginBottom: 8 }}>{err}</p>
              )}
              <div className="ob-field">
                <div className="ob-label">Thesis (short)</div>
                <textarea
                  className="ob-input ob-textarea"
                  placeholder="Operational resilience, clear communication..."
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="ob-nav-footer">
        <button
          type="button"
          className="ob-back"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          style={{ opacity: step === 1 ? 0.3 : 1, pointerEvents: step === 1 ? "none" : "auto" }}
        >
          ←
        </button>
        <button
          type="button"
          className="ob-next"
          disabled={saving}
          onClick={() => {
            if (step >= 3) void saveProfile();
            else setStep((s) => s + 1);
          }}
        >
          {step >= 3 ? (saving ? "Saving…" : "Complete Profile →") : "Next →"}
        </button>
      </div>
    </div>
  );
}
