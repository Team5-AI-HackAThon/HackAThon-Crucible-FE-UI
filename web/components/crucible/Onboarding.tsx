"use client";

import { useState } from "react";

type RoleSelectProps = {
  selected: "founder" | "vc";
  onSelect: (r: "founder" | "vc") => void;
  onContinue: () => void;
};

export function RoleSelectScreen({ selected, onSelect, onContinue }: RoleSelectProps) {
  return (
    <div className="screen active" id="s-onboard" style={{ justifyContent: "center" }}>
      <div className="sa" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ob-wrap">
          <div className="ob-flame">🔥</div>
          <div className="ob-logo">
            Cruc<span>ible</span>
          </div>
          <div className="ob-sub">{"// Pre-seed & seed · behavioral matching"}</div>
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
          <button type="button" className="ob-cta" onClick={onContinue}>
            Continue →
          </button>
          <div className="ob-signin">
            Already have an account? <a href="#">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const F_LABELS = [
  "Step 1 of 3 — Startup Basics",
  "Step 2 of 3 — Team & Details",
  "Step 3 of 3 — Value-Add & Review",
];

type FounderProps = {
  onSkip: () => void;
  onComplete: () => void;
};

export function FounderOnboarding({ onSkip, onComplete }: FounderProps) {
  const [step, setStep] = useState(1);
  const pct = (step / 3) * 100;

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
            {step} / 3
          </div>
        </div>
        <div className="ob-prog-track">
          <div className="ob-prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="ob-steps-wrap">
        <div
          className="ob-step visible"
          style={{ position: "relative", inset: "auto", height: "100%" }}
        >
          {step === 1 && (
            <>
              <div>
                <div className="step-title">
                  Your <span>Startup</span>
                </div>
                <div className="step-sub">Tell us the basics so investors can find you.</div>
              </div>
              <div className="ob-field">
                <div className="ob-label">Startup Name</div>
                <input className="ob-input" placeholder="e.g. Vanta AI" />
              </div>
              <div className="ob-field">
                <div className="ob-label">Headquarters City</div>
                <input className="ob-input" placeholder="e.g. San Francisco, CA" />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <div className="step-title">
                  Team & <span>Details</span>
                </div>
                <div className="step-sub">Help investors understand your startup&apos;s makeup.</div>
              </div>
              <div className="ob-field">
                <div className="ob-label">Industry / Sector</div>
                <div className="ob-options">
                  {["AI / ML", "B2B SaaS", "Fintech", "Climate"].map((x) => (
                    <div key={x} className="ob-option">
                      {x}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div>
                <div className="step-title">
                  Almost <span>There</span>
                </div>
                <div className="step-sub">Review and complete your founder profile.</div>
              </div>
              <div className="ob-field">
                <div className="ob-label">One-line pitch</div>
                <textarea className="ob-input ob-textarea" placeholder="What are you building?" />
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
          onClick={() => {
            if (step >= 3) onComplete();
            else setStep((s) => s + 1);
          }}
        >
          {step >= 3 ? "Complete Profile →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

const I_LABELS = [
  "Step 1 of 3 — Stage & Check Size",
  "Step 2 of 3 — Sector & Filters",
  "Step 3 of 3 — Investment Thesis",
];

type InvestorProps = {
  onSkip: () => void;
  onComplete: () => void;
};

export function InvestorOnboarding({ onSkip, onComplete }: InvestorProps) {
  const [step, setStep] = useState(1);
  const pct = (step / 3) * 100;

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
                  Your <span>Thesis</span>
                </div>
                <div className="step-sub">Stage focus and typical check size.</div>
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
                  Sector <span>Focus</span>
                </div>
                <div className="step-sub">Where you spend time.</div>
              </div>
              <div className="ob-options">
                {["AI / ML", "B2B SaaS", "Climate", "Fintech"].map((x) => (
                  <div key={x} className="ob-option">
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
                  Investment <span>Thesis</span>
                </div>
                <div className="step-sub">What you look for in founders.</div>
              </div>
              <div className="ob-field">
                <div className="ob-label">Thesis (short)</div>
                <textarea
                  className="ob-input ob-textarea"
                  placeholder="Operational resilience, clear communication..."
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
          onClick={() => {
            if (step >= 3) onComplete();
            else setStep((s) => s + 1);
          }}
        >
          {step >= 3 ? "Complete Profile →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
