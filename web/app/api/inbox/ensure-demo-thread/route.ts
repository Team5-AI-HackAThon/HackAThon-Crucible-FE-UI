import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo users from `20250406140000_seed_feed_items.sql` (must exist in `profiles`). */
const DEFAULT_DEMO_VC_ID = "b3333333-3333-4333-8333-333333333333";
const DEFAULT_DEMO_FOUNDER_ID = "a1111111-1111-4111-8111-111111111111";

function demoSeedAllowed(): boolean {
  if (process.env.CRUCIBLE_DISABLE_INBOX_DEMO_SEED === "true") return false;
  if (process.env.CRUCIBLE_ENABLE_INBOX_DEMO_SEED === "true") return true;
  return process.env.NODE_ENV === "development";
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Creates a single open thread (no project) between the signed-in user and the seeded demo
 * counterparty so the same Google/email login can use Inbox without feed-demo-* accounts.
 *
 * Enabled when NODE_ENV=development, or set CRUCIBLE_ENABLE_INBOX_DEMO_SEED=true.
 * Disable with CRUCIBLE_DISABLE_INBOX_DEMO_SEED=true.
 */
export async function POST() {
  if (!demoSeedAllowed()) {
    return NextResponse.json({ error: "Demo inbox seed is disabled." }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const demoVcId = process.env.CRUCIBLE_DEMO_VC_USER_ID ?? DEFAULT_DEMO_VC_ID;
    const demoFounderId = process.env.CRUCIBLE_DEMO_FOUNDER_USER_ID ?? DEFAULT_DEMO_FOUNDER_ID;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    let founderId: string;
    let vcId: string;
    if (profile.role === "investor") {
      founderId = demoFounderId;
      vcId = user.id;
    } else {
      founderId = user.id;
      vcId = demoVcId;
    }

    const counterId = founderId === user.id ? vcId : founderId;
    const { data: counter, error: cErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", counterId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!counter) {
      return NextResponse.json(
        {
          error: "Demo counterparty profile is missing in the database.",
          hint:
            "In Supabase SQL Editor run supabase/manual/seed_inbox_only_counterparties.sql (minimal), or the full migration 20250406140000_seed_feed_items.sql.",
        },
        { status: 422 },
      );
    }

    const { data: existing, error: exErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("founder_id", founderId)
      .eq("vc_id", vcId)
      .is("project_id", null)
      .maybeSingle();
    if (exErr) throw exErr;

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: inserted, error: insErr } = await supabase
        .from("conversations")
        .insert({
          founder_id: founderId,
          vc_id: vcId,
          project_id: null,
          last_message_at: isoNow(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      conversationId = inserted.id;
    }

    const t = isoNow();
    const chatJson =
      profile.role === "investor"
        ? {
            schema_version: 1,
            project_id: null as null,
            messages: [
              {
                sender_id: demoFounderId,
                sender_role: "founder",
                body: "Thanks for connecting — here is a quick note from the demo founder profile.",
                read_at: t,
                created_at: new Date(Date.now() - 3600_000).toISOString(),
              },
              {
                sender_id: user.id,
                sender_role: "investor",
                body: "Great to hear from you. This thread is auto-linked to your login for inbox testing.",
                read_at: null,
                created_at: t,
              },
            ],
          }
        : {
            schema_version: 1,
            project_id: null as null,
            messages: [
              {
                sender_id: demoVcId,
                sender_role: "investor",
                body: "Hi — this sample thread is tied to your account so you can use the same login as the rest of the app.",
                read_at: null,
                created_at: new Date(Date.now() - 1800_000).toISOString(),
              },
              {
                sender_id: user.id,
                sender_role: "founder",
                body: "Sounds good — replying from my session to verify inbox + chat_json.",
                read_at: null,
                created_at: t,
              },
            ],
          };

    const { error: upErr } = await supabase
      .from("conversations")
      .update({
        last_message_at: t,
        chat_json: chatJson,
      })
      .eq("id", conversationId);
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, conversationId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create demo thread";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
