/**
 * Server-only: downloads video bytes for feed import (direct URLs + YouTube watch URLs via ytdl).
 * Do not import from client components.
 */
import ytdl from "@distube/ytdl-core";

export const FEED_IMPORT_MAX_BYTES = 80 * 1024 * 1024;

function looksLikeHtml(ct: string | null, firstBytes: Uint8Array): boolean {
  const c = (ct ?? "").toLowerCase();
  if (c.includes("text/html")) return true;
  const head = new TextDecoder().decode(firstBytes.slice(0, 64)).toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

async function readResponseWithCap(res: Response, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  const len = res.headers.get("content-length");
  if (len) {
    const n = Number(len);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new Error("Video is too large");
    }
  }
  if (!res.body) {
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) throw new Error("Video is too large");
    return new Uint8Array(ab);
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error("Video is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

export function isYoutubePageUrl(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  if (h === "youtu.be") return true;
  if (
    h === "youtube.com" ||
    h === "www.youtube.com" ||
    h === "m.youtube.com" ||
    h === "music.youtube.com"
  ) {
    return (
      url.pathname.startsWith("/watch") ||
      url.pathname.startsWith("/shorts/") ||
      url.pathname.startsWith("/embed/")
    );
  }
  return false;
}

function extFromVideoResponse(contentType: string | null, url: URL): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("quicktime")) return "mov";
  if (ct.includes("matroska") || ct.includes("mkv")) return "mkv";
  const m = url.pathname.match(/\.(webm|mp4|mov|mkv)$/i);
  if (m) return m[1].toLowerCase();
  return "mp4";
}

export type DownloadedFeedVideo = {
  buf: Uint8Array;
  contentType: string | null;
  ext: string;
  youtubeVideoId: string | null;
};

export async function downloadVideoForFeedImport(
  videoUrlStr: string,
  publicUrl: URL,
  signal: AbortSignal,
): Promise<DownloadedFeedVideo> {
  if (isYoutubePageUrl(publicUrl)) {
    let info: Awaited<ReturnType<typeof ytdl.getInfo>>;
    try {
      info = await ytdl.getInfo(videoUrlStr);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "YouTube lookup failed";
      throw new Error(
        `Could not read this YouTube video (${msg}). Private, age-restricted, or region-blocked videos often fail — try a direct MP4 link instead.`,
      );
    }
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "videoandaudio",
    });
    if (!format?.url) {
      throw new Error(
        "No single-file download for this YouTube video (only split audio/video streams). Use a direct .mp4 link, or export with yt-dlp/ffmpeg locally.",
      );
    }
    const streamUrl = format.url;
    const container = "container" in format && typeof format.container === "string" ? format.container : "mp4";
    const ext = container === "webm" ? "webm" : "mp4";
    const res = await fetch(streamUrl, {
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
    });
    if (!res.ok) {
      throw new Error(`Could not download from YouTube CDN (HTTP ${res.status})`);
    }
    const buf = await readResponseWithCap(res, FEED_IMPORT_MAX_BYTES, signal);
    const mime =
      "mimeType" in format && typeof format.mimeType === "string"
        ? format.mimeType.split(";")[0]?.trim()
        : ext === "webm"
          ? "video/webm"
          : "video/mp4";
    const youtubeVideoId = info.videoDetails?.videoId ?? null;
    return {
      buf,
      contentType: mime ?? null,
      ext,
      youtubeVideoId,
    };
  }

  const res = await fetch(publicUrl.toString(), {
    redirect: "follow",
    signal,
    headers: {
      "User-Agent": "CrucibleFeedImport/1.0",
      Accept: "video/*,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Could not download video (HTTP ${res.status})`);
  }
  const lenHeader = res.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > FEED_IMPORT_MAX_BYTES) {
      throw new Error("Video is too large");
    }
  }
  const buf = await readResponseWithCap(res, FEED_IMPORT_MAX_BYTES, signal);
  const contentType = res.headers.get("content-type");
  if (looksLikeHtml(contentType, buf)) {
    throw new Error(
      "This URL is not a raw video file. Paste a YouTube watch link, or a direct .mp4 / .webm URL.",
    );
  }
  const ext = extFromVideoResponse(contentType, publicUrl);
  return { buf, contentType, ext, youtubeVideoId: null };
}
