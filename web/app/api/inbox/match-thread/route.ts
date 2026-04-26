import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchRow = {
  id: string;
  vc_id: string;
  project_id: string;
  last_action: string | null;
  projects: { id: string; founder_id: string; name: string };
};

/**
 * Founder-only: get or create the inbox conversation for this match
 * (same founder, VC, and project as `project_vc_matches`). Requires `last_action = interested`.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const matchId =
      typeof body === "object" && body !== null && "matchId" in body && typeof (body as { matchId: unknown }).matchId === "string"
        ? (body as { matchId: string }).matchId.trim()
        : "";
    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profErr) throw profErr;
    if (profile?.role !== "founder") {
      return NextResponse.json({ error: "Only founders can open a thread from a match." }, { status: 403 });
    }

    const { data: row, error: mErr } = await supabase
      .from("project_vc_matches")
      .select("id, vc_id, project_id, last_action, projects!inner(id, founder_id, name)")
      .eq("id", matchId)
      .maybeSingle();

    if (mErr) throw mErr;
    if (!row) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const m = row as unknown as MatchRow;
    const proj = m.projects;
    if (!proj || proj.founder_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const la = (m.last_action ?? "").toString().trim().toLowerCase();
    if (la !== "interested") {
      return NextResponse.json(
        { error: "Mark this match as Interested before starting a chat." },
        { status: 422 },
      );
    }

    const founderId = user.id;
    const vcId = m.vc_id;
    const projectId = m.project_id;

    const { data: existing, error: exErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("founder_id", founderId)
      .eq("vc_id", vcId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existing?.id) {
      return NextResponse.json({ ok: true, conversationId: existing.id, created: false });
    }

    const t = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("conversations")
      .insert({
        founder_id: founderId,
        vc_id: vcId,
        project_id: projectId,
        last_message_at: t,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, conversationId: inserted.id, created: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to open thread";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
