import { createClient } from "@/lib/supabase/server";
import { getCruciblePythonBeBaseUrl, getPythonSubmitMediaAssetPath } from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MediaAssetRow = {
  id: string;
  owner_id: string;
  project_id: string | null;
  kind: string;
  storage_bucket: string;
  storage_path: string;
  duration_seconds: number | null;
  duration_ms: number | null;
  mime_type: string | null;
  thumbnail_path: string | null;
  published_at: string | null;
  quiz_template_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * Loads the caller's `media_assets` row and POSTs it to the Python app as JSON
 * (default path `/submit-async`, override with CRUCIBLE_PYTHON_SUBMIT_MEDIA_PATH).
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

    let body: { media_asset_id?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const mediaId = String(body.media_asset_id ?? "").trim();
    if (!mediaId) {
      return NextResponse.json({ error: "media_asset_id is required" }, { status: 400 });
    }

    const { data: row, error: qErr } = await supabase
      .from("media_assets")
      .select(
        "id, owner_id, project_id, kind, storage_bucket, storage_path, duration_seconds, duration_ms, mime_type, thumbnail_path, published_at, quiz_template_slug, metadata, created_at, updated_at",
      )
      .eq("id", mediaId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (qErr) throw qErr;
    if (!row) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const media_asset = row as unknown as MediaAssetRow;

    const url = `${getCruciblePythonBeBaseUrl()}${getPythonSubmitMediaAssetPath()}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ media_asset }),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await upstream.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: text.slice(0, 400) || "Invalid response from analysis service", httpStatus: upstream.status },
        { status: upstream.ok ? 502 : upstream.status },
      );
    }

    return NextResponse.json(
      typeof json === "object" && json !== null ? json : { ok: upstream.ok },
      { status: upstream.status },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "submit-media-asset failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
