import { createClient } from "@/lib/supabase/server";
import { getCruciblePythonBeBaseUrl } from "@/lib/cruciblePythonBe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxies `GET /api/v1/sentiment/status/{sentiment_output_id}` after verifying * the sentiment row belongs to media owned by the signed-in user.
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

    const url = `${getCruciblePythonBeBaseUrl()}/api/v1/sentiment/status/${encodeURIComponent(sentimentOutputId.trim())}`;
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const text = await upstream.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: text.slice(0, 300) || "Invalid JSON from analysis service" },
        { status: 502 },
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        typeof body === "object" && body !== null ? body : { error: body },
        { status: upstream.status },
      );
    }

    return NextResponse.json(body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "status failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
