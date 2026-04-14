import { getCruciblePythonBeBaseUrl } from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxies GET /health on the Python backend so the browser avoids CORS.
 * Always returns 200 with JSON { ok: boolean, ... } for easy client handling.
 */
export async function GET() {
  const url = `${getCruciblePythonBeBaseUrl()}/health`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json({ ok: false, httpStatus: res.status });
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return NextResponse.json({ ok: true });
    }
    const statusField =
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      typeof (body as { status: unknown }).status === "string"
        ? (body as { status: string }).status.toLowerCase()
        : null;
    if (statusField === "unhealthy" || statusField === "error" || statusField === "down") {
      return NextResponse.json({ ok: false, body });
    }
    return NextResponse.json({ ok: true, body });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ ok: false, reason: "unreachable" });
  }
}
