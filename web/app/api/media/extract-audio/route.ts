import { createClient } from "@/lib/supabase/server";
import {
  getCruciblePythonBeBaseUrl,
  getPythonExtractAudioFormField,
  getPythonExtractAudioPath,
} from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Vercel: allow long Python + upload (adjust per plan). */
export const maxDuration = 300;

function jsonErr(
  status: number,
  payload: {
    error: string;
    step: string;
    detail?: string;
    upstream_status?: number;
    upstream_content_type?: string;
    hint?: string;
  },
) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: Request) {
  const pathConfigured = getPythonExtractAudioPath();
  const fieldConfigured = getPythonExtractAudioFormField();
  const baseConfigured = getCruciblePythonBeBaseUrl();

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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mediaAssetId = String(body.media_asset_id ?? "").trim();
    if (!mediaAssetId) {
      return NextResponse.json({ error: "media_asset_id is required" }, { status: 400 });
    }

    const { data: row, error: rowErr } = await supabase
      .from("media_assets")
      .select("id, owner_id, kind, storage_bucket, storage_path, mime_type")
      .eq("id", mediaAssetId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (rowErr) {
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }
    if (!row || row.kind !== "video") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const { data: videoBlob, error: dlErr } = await supabase.storage
      .from(row.storage_bucket)
      .download(row.storage_path);

    if (dlErr || !videoBlob) {
      return jsonErr(502, {
        step: "storage_download",
        error: dlErr?.message ?? "Could not download video from storage",
        hint: "Check RLS and that the file exists in the bucket at storage_path.",
      });
    }

    const field = fieldConfigured;
    const baseUrl = baseConfigured;
    const path = pathConfigured;
    const upstreamUrl = `${baseUrl}${path}`;

    const vidName =
      row.storage_path.split("/").pop() ||
      `clip.${(row.mime_type || "").includes("mp4") ? "mp4" : "webm"}`;
    const videoType = row.mime_type || "application/octet-stream";

    const fd = new FormData();
    fd.append(field, new Blob([await videoBlob.arrayBuffer()], { type: videoType }), vidName);

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(300_000),
      });
    } catch (netErr) {
      const msg = netErr instanceof Error ? netErr.message : "fetch failed";
      console.error("[extract-audio] upstream network error", upstreamUrl, msg);
      return jsonErr(502, {
        step: "upstream_network",
        error: "Could not reach the audio extract service.",
        detail: msg,
        hint: `Set CRUCIBLE_PYTHON_BE_URL (or NEXT_PUBLIC_) to your Python host. Expected POST ${path} with multipart field "${field}" returning raw MP3 bytes.`,
      });
    }

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      const snippet = errText.replace(/\s+/g, " ").trim().slice(0, 400);
      console.error(
        "[extract-audio] upstream HTTP",
        upstream.status,
        upstreamUrl,
        snippet || "(empty body)",
      );
      return jsonErr(502, {
        step: "upstream_http",
        error:
          snippet ||
          `Audio extract service returned HTTP ${upstream.status} (not OK).`,
        upstream_status: upstream.status,
        detail: snippet || undefined,
        hint: `Python must expose POST ${path} (full URL: ${upstreamUrl}). Typical fix: implement this route or set CRUCIBLE_PYTHON_EXTRACT_AUDIO_PATH to the correct path on your API.`,
      });
    }

    const respCt = (upstream.headers.get("content-type") || "").toLowerCase();
    const buf = await upstream.arrayBuffer();

    if (buf.byteLength < 64) {
      return jsonErr(502, {
        step: "upstream_body",
        error: "Audio extract service returned an empty or too-small body.",
        upstream_status: upstream.status,
        upstream_content_type: respCt || undefined,
        hint: "Response should be raw MP3 (ideally Content-Type: audio/mpeg).",
      });
    }

    const looksAudio =
      respCt.includes("audio/mpeg") ||
      respCt.includes("audio/mp3") ||
      respCt.includes("octet-stream") ||
      respCt === "" ||
      respCt.includes("binary");

    const headUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 240));
    const looksLikeHtmlOrJson =
      respCt.includes("text/html") ||
      respCt.includes("application/json") ||
      headUtf8.trimStart().startsWith("<") ||
      headUtf8.trimStart().startsWith("{");

    if (!looksAudio && looksLikeHtmlOrJson) {
      return jsonErr(502, {
        step: "upstream_body",
        error:
          "Audio service returned HTML or JSON instead of binary MP3 (often means 404 page or FastAPI validation error).",
        upstream_status: upstream.status,
        upstream_content_type: respCt || undefined,
        detail: headUtf8.replace(/\s+/g, " ").trim().slice(0, 300),
        hint: `Implement POST ${path} returning raw MP3, or fix CRUCIBLE_PYTHON_EXTRACT_AUDIO_PATH.`,
      });
    }

    if (!looksAudio && respCt.includes("application/json")) {
      return jsonErr(502, {
        step: "upstream_body",
        error: "Audio service returned JSON instead of MP3.",
        detail: headUtf8.slice(0, 300),
        hint: `Set CRUCIBLE_PYTHON_EXTRACT_AUDIO_PATH to a route that returns audio/mpeg bytes.`,
      });
    }

    const basePath = row.storage_path.replace(/\.[^/.]+$/, "");
    const audioPath = `${basePath}-audio.mp3`;

    const { error: upErr } = await supabase.storage.from(row.storage_bucket).upload(audioPath, buf, {
      cacheControl: "3600",
      upsert: true,
      contentType: "audio/mpeg",
    });

    if (upErr) {
      return jsonErr(500, {
        step: "storage_upload",
        error: upErr.message,
        hint: "Confirm crucible-media allows audio/mpeg uploads (migration 20250406230000).",
      });
    }

    const { error: updErr } = await supabase
      .from("media_assets")
      .update({
        audio_storage_path: audioPath,
        audio_mime_type: "audio/mpeg",
      })
      .eq("id", row.id)
      .eq("owner_id", user.id);

    if (updErr) {
      return jsonErr(500, {
        step: "db_update",
        error: updErr.message,
        hint: "Confirm media_assets.audio_storage_path exists (migration applied).",
      });
    }

    return NextResponse.json({
      ok: true,
      audio_storage_path: audioPath,
      audio_mime_type: "audio/mpeg",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Extract audio failed";
    console.error("[extract-audio] unhandled", msg);
    return jsonErr(500, { step: "internal", error: msg });
  }
}
