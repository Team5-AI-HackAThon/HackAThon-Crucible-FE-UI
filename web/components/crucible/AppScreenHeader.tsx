"use client";

import Image from "next/image";
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
          <span className="hdr-logo-imgwrap">
            <Image
              src="/pear-icon.png"
              alt="PEAR"
              width={34}
              height={34}
              className="hdr-logo-mark"
              priority
            />
          </span>
          <span className="logo-text">
            PE<span>AR</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{rightSlot}</div>
      </div>
    </div>
  );
}
