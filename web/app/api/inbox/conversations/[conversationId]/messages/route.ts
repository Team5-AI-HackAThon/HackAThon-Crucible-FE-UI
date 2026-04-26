import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 8000;

/**
 * POST body: `{ "body": "…" }` — appends a row to `messages` for this conversation (RLS: participant, sender = self).
 */
export async function POST(req: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await ctx.params;
    if (!conversationId?.trim()) {
      return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw =
      typeof body === "object" && body !== null && "body" in body ? (body as { body: unknown }).body : undefined;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "body must be a non-empty string" }, { status: 400 });
    }
    if (text.length > MAX_LEN) {
      return NextResponse.json({ error: `Message too long (max ${MAX_LEN} characters)` }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: conv, error: cErr } = await supabase
      .from("conversations")
      .select("id, founder_id, vc_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conv.founder_id !== user.id && conv.vc_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: text,
        read_at: null,
      })
      .select("id, body, created_at, sender_id, read_at")
      .single();
    if (insErr) throw insErr;

    const { error: upErr } = await supabase
      .from("conversations")
      .update({ last_message_at: now })
      .eq("id", conversationId);
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, message: inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
