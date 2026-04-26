"use client";

import type { CSSProperties, ReactNode } from "react";

export function AppScreenHeader({
  firstName,
  rightSlot,
  hdrStyle,
}: {
  firstName: string;
  rightSlot: ReactNode;
  hdrStyle?: CSSProperties;
}) {
  return (
    <div className="hdr" style={hdrStyle}>
      <div className="hdr-greet">Hello {firstName}</div>
      <div className="hdr-top">
        <div className="logo">
          PE<span>AR</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{rightSlot}</div>
      </div>
    </div>
  );
}
