import { createClient } from "@/lib/supabase/server";
import { getCruciblePythonBeBaseUrl } from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseDurationMsFromForm(raw: FormDataEntryValue | null): string | null {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  const capped = Math.min(Math.floor(n), 24 * 60 * 60 * 1000);
  return String(capped);
}

/**
 * Proxies multipart upload to Python `POST /api/v1/sentiment/video/submit-async`.
 * Injects `owner_id` from the signed-in user (must match form contract).
 * Forwards optional `duration_ms` (whole milliseconds) to the backend when present.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let incoming: FormData;
    try {
      incoming = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
    }

    const file = incoming.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const outgoing = new FormData();
    outgoing.append("file", file, file.name || "recording.webm");
    outgoing.append("owner_id", user.id);

    const projectRaw = incoming.get("project_id");
    if (typeof projectRaw === "string" && projectRaw.trim()) {
      const pid = projectRaw.trim();
      const { data: proj, error: pErr } = await supabase
        .from("projects")
        .select("id")
        .eq("id", pid)
        .eq("founder_id", user.id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!proj) {
        return NextResponse.json({ error: "Invalid project_id" }, { status: 403 });
      }
      outgoing.append("project_id", pid);
    }

    const kindRaw = incoming.get("media_kind");
    outgoing.append(
      "media_kind",
      typeof kindRaw === "string" && kindRaw.trim() ? kindRaw.trim() : "video",
    );

    const durationMs = parseDurationMsFromForm(incoming.get("duration_ms"));
    if (durationMs != null) {
      outgoing.append("duration_ms", durationMs);
    }

    const url = `${getCruciblePythonBeBaseUrl()}/api/v1/sentiment/video/submit-async`;
    const upstream = await fetch(url, {
      method: "POST",
      body: outgoing,
      signal: AbortSignal.timeout(120_000),
    });

    const text = await upstream.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: text.slice(0, 500) || "Invalid JSON from analysis service", httpStatus: upstream.status },
        { status: upstream.ok ? 502 : upstream.status },
      );
    }

    return NextResponse.json(body, { status: upstream.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "submit-async failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
