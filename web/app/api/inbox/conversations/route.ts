import { fetchInboxPreviews } from "@/lib/data/inbox";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns inbox rows for the signed-in user (conversations + joined preview data).
 * Uses cookie session from Supabase SSR; RLS applies on the server client.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint:
            "Session cookies are missing. Sign in through the app (not only the REST URL). Opening /api/inbox/conversations in a new tab usually returns 401 because the browser does not send the Supabase auth cookie.",
        },
        { status: 401 },
      );
    }

    const conversations = await fetchInboxPreviews(supabase, user.id);
    return NextResponse.json({ conversations });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load conversations";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
