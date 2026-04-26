/** Default: production Render host for [Video Intelligence API](https://hackathon-crucible-be-python-app.onrender.com/docs). */
export const DEFAULT_CRUCIBLE_PYTHON_BE_URL =
  "https://hackathon-crucible-be-python-app.onrender.com";

export function getCruciblePythonBeBaseUrl(): string {
  const raw =
    process.env.CRUCIBLE_PYTHON_BE_URL ??
    process.env.NEXT_PUBLIC_CRUCIBLE_PYTHON_BE_URL ??
    DEFAULT_CRUCIBLE_PYTHON_BE_URL;
  return raw.replace(/\/$/, "");
}

/** JSON body POST for existing media row (default matches Render app `/submit-async`). */
export function getPythonSubmitMediaAssetPath(): string {
  const p = process.env.CRUCIBLE_PYTHON_SUBMIT_MEDIA_PATH ?? "/submit-async";
  return p.startsWith("/") ? p : `/${p}`;
}

/** Multipart POST: video file field → response body = MP3 (audio/mpeg). Override if your API differs. */
export function getPythonExtractAudioPath(): string {
  const p = process.env.CRUCIBLE_PYTHON_EXTRACT_AUDIO_PATH ?? "/api/v1/media/extract-audio";
  return p.startsWith("/") ? p : `/${p}`;
}

/** Form field name for the video part (default `file`). */
export function getPythonExtractAudioFormField(): string {
  return process.env.CRUCIBLE_PYTHON_EXTRACT_AUDIO_FIELD?.trim() || "file";
}
