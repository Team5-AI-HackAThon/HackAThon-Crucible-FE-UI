import { Suspense } from "react";
import { CrucibleApp } from "@/components/crucible/CrucibleApp";

function ShellFallback() {
  return (
    <div className="shell">
      <div className="screen active" style={{ justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <CrucibleApp />
    </Suspense>
  );
}
