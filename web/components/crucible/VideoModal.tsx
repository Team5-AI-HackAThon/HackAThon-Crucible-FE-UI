"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VideoModal({ open, onClose }: Props) {
  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-video">
          <div className="modal-video-bg g1" />
          <div className="vthumb-grain" />
          <div className="modal-play-large">
            <div className="modal-play-c">▶</div>
          </div>
          <div className="modal-faces-row">
            <div className="modal-face fa">J</div>
            <div className="modal-face fb">A</div>
            <div className="modal-face fc">R</div>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div className="cco-dot d1" style={{ width: 32, height: 32, fontSize: 16 }}>
              V
            </div>
            <div>
              <div className="modal-co-name">Vanta AI</div>
              <div className="modal-co-stage">Seed · $2.4M · San Francisco</div>
            </div>
            <div className="mc-score-pill score-green" style={{ marginLeft: "auto", fontSize: 18 }}>
              94%
            </div>
          </div>
          <div className="modal-prompt-tag">🔥 Prompt 1 — Fire Escape · Dallas</div>
          <div className="modal-prompt-text">
            &quot;48th floor, Santander Building. Floors 20–30 completely on fire. How does your team get
            out?&quot;
          </div>
          <div className="sent-section-title">{"// Sentiment Analysis Breakdown"}</div>
          <div className="sent-breakdown">
            <div className="sb-row">
              <div className="sb-top">
                <div className="sb-label">Strong Communication</div>
                <div className="sb-score score-high">91</div>
              </div>
              <div className="sb-bar-track">
                <div className="sb-bar-fill fill-high" style={{ width: "91%" }} />
              </div>
              <div className="sb-desc">
                Team articulated their plan clearly under time pressure. All members contributed.
              </div>
            </div>
            <div className="sb-row">
              <div className="sb-top">
                <div className="sb-label">Clear Leadership</div>
                <div className="sb-score score-high">88</div>
              </div>
              <div className="sb-bar-track">
                <div className="sb-bar-fill fill-high" style={{ width: "88%" }} />
              </div>
              <div className="sb-desc">
                CEO led decisively without overriding team input. Decision structure was visible.
              </div>
            </div>
          </div>
          <div className="modal-match-block">
            <div className="mmb-top">
              <div className="mmb-title">{"// Match Score For You"}</div>
              <div className="mmb-score">94%</div>
            </div>
            <div className="mmb-bar-row">
              <div className="mmb-lbl">Thesis Fit</div>
              <div className="mmb-track">
                <div className="mmb-fill" style={{ width: "96%" }} />
              </div>
            </div>
            <div className="mmb-bar-row">
              <div className="mmb-lbl">Stage</div>
              <div className="mmb-track">
                <div className="mmb-fill" style={{ width: "92%" }} />
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-act ma-int" onClick={onClose}>
              ✓ Interested
            </button>
            <button type="button" className="modal-act ma-pass" onClick={onClose}>
              ✕ Pass
            </button>
            <button type="button" className="modal-act ma-save" onClick={onClose}>
              ♡ Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
