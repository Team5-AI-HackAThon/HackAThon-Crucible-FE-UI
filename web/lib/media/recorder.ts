/** Browser-supported MediaRecorder mime type for short video clips. */
export function pickRecorderMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

/** Audio-only WebM/Opus for a parallel track (same mic as video, cloned tracks). */
export function pickAudioRecorderMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export async function getCameraStream(): Promise<MediaStream> {
  const mobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  // Mobile: portrait-friendly ideals; desktop: landscape HD. Display still uses CSS (contain vs cover).
  const videoConstraints: MediaTrackConstraints = mobile
    ? { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }
    : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };

  return navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: true,
  });
}

/** Start recording; call `recorder.stop()` when finished, then await `blobPromise`. */
export function startMediaRecorder(stream: MediaStream): {
  recorder: MediaRecorder;
  blobPromise: Promise<Blob>;
} {
  const mime = pickRecorderMimeType();
  const rec = mime
    ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
    : new MediaRecorder(stream, { videoBitsPerSecond: 2_500_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const blobPromise = new Promise<Blob>((resolve, reject) => {
    rec.onerror = () => reject(new Error("Recording failed"));
    rec.onstop = () => {
      resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    };
  });
  rec.start(250);
  return { recorder: rec, blobPromise };
}

/**
 * Records audio only (e.g. cloned mic tracks). Caller should stop cloned tracks after `blobPromise` settles.
 * Uses a modest bitrate suitable for speech / transcript pipelines.
 */
export function startAudioOnlyMediaRecorder(stream: MediaStream): {
  recorder: MediaRecorder;
  blobPromise: Promise<Blob>;
} {
  const mime = pickAudioRecorderMimeType();
  const rec = mime
    ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 })
    : new MediaRecorder(stream, { audioBitsPerSecond: 128_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const blobPromise = new Promise<Blob>((resolve, reject) => {
    rec.onerror = () => reject(new Error("Audio recording failed"));
    rec.onstop = () => {
      resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
  });
  rec.start(250);
  return { recorder: rec, blobPromise };
}

/** Clone audio tracks into a dedicated stream so video + parallel audio recorders do not contend for one track. */
export function cloneAudioTracksStream(source: MediaStream): { stream: MediaStream; clones: MediaStreamTrack[] } {
  const clones = source.getAudioTracks().map((t) => t.clone());
  return { stream: new MediaStream(clones), clones };
}
