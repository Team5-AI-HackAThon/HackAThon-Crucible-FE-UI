/** 202 response from `POST {BASE}/submit-async` (JSON body with existing Storage object). */
export type SubmitAsyncJson202Response = {
  sentiment_output_id?: string;
  media_asset_id?: string;
  media_url?: string;
  sse_events_path?: string;
  status_poll_path?: string;
  job_status?: string;
  message?: string;
};

/** One SSE `data:` payload (minimal fields per API spec). */
export type SubmitAsyncSseEvent = {
  stage?: string;
  message?: string;
  progress?: number;
  sentiment_output_id?: string;
};

export function parseSubmitAsyncSseData(data: string): SubmitAsyncSseEvent | null {
  const s = data.trim();
  if (!s) return null;
  try {
    return JSON.parse(s) as SubmitAsyncSseEvent;
  } catch {
    return null;
  }
}
