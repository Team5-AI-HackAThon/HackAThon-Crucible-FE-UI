import { createClient } from "@/lib/supabase/server";
import { getCruciblePythonBeBaseUrl } from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BFF: proxies Server-Sent Events from Python * `GET {BASE}/submit-async/events/{sentiment_output_id}` so the browser stays same-origin
 * (EventSource + cookies/session).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ sentimentOutputId: string }> },
) {
  try {
    const { sentimentOutputId } = await context.params;
    if (!sentimentOutputId?.trim()) {
      return NextResponse.json({ error: "Missing sentiment_output id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: so, error: soErr } = await supabase
      .from("sentiment_outputs")
      .select("media_asset_id")
      .eq("id", sentimentOutputId.trim())
      .maybeSingle();

    if (soErr) throw soErr;
    if (!so) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: asset, error: aErr } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", so.media_asset_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (aErr) throw aErr;
    if (!asset) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const upstreamUrl = `${getCruciblePythonBeBaseUrl()}/submit-async/events/${encodeURIComponent(sentimentOutputId.trim())}`;
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: text.slice(0, 200) || "SSE upstream error", httpStatus: upstream.status },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "SSE proxy failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
