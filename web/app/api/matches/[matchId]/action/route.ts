import { updateMatchLastAction, type InterestAction } from "@/lib/data/matches";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isInterestAction(x: unknown): x is InterestAction {
  return x === "interested" || x === "pass" || x === "save";
}

/**
 * POST body: `{ "action": "interested" | "pass" | "save" }`
 * Updates `project_vc_matches.last_action` for the signed-in user (RLS: VC or project founder).
 */
export async function POST(req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await ctx.params;
    if (!matchId?.trim()) {
      return NextResponse.json({ error: "Missing match id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const action = typeof body === "object" && body !== null ? (body as { action?: unknown }).action : undefined;
    if (!isInterestAction(action)) {
      return NextResponse.json(
        { error: 'Body must include action: "interested" | "pass" | "save"' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updateMatchLastAction(supabase, matchId.trim(), action);
    return NextResponse.json({ ok: true, lastAction: action });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (msg.includes("not permitted") || msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
