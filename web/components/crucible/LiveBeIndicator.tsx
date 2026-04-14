"use client";

import { useCallback, useEffect, useState } from "react";

type BeState = "checking" | "up" | "down";

const POLL_MS = 45_000;

export function LiveBeIndicator() {
  const [state, setState] = useState<BeState>("checking");

  const ping = useCallback(async () => {
    try {
      const res = await fetch("/api/health/python-be", { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean };
      setState(j.ok === true ? "up" : "down");
    } catch {
      setState("down");
    }
  }, []);

  useEffect(() => {
    void ping();
    const id = window.setInterval(() => void ping(), POLL_MS);
    return () => window.clearInterval(id);
  }, [ping]);

  const dotClass =
    state === "checking" ? "live-be-dot live-be-dot--pending" : state === "up" ? "live-be-dot live-be-dot--up" : "live-be-dot live-be-dot--down";

  return (
    <div className="live-be" title="Python Video Intelligence API health (GET /health)">
      <span className={dotClass} aria-hidden />
      <span className="live-be-label">Live-BE</span>
    </div>
  );
}
