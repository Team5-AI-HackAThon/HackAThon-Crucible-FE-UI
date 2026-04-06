import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "founder" | "investor";

const ROLE_KEY = "crucible_pending_role";

export function setPendingRole(role: "founder" | "vc") {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ROLE_KEY, role);
}

export function takePendingRole(): "founder" | "vc" | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(ROLE_KEY);
  window.sessionStorage.removeItem(ROLE_KEY);
  if (v === "founder" || v === "vc") return v;
  return null;
}

export function mapUiRoleToDb(role: "founder" | "vc"): AppRole {
  return role === "founder" ? "founder" : "investor";
}

export async function syncProfileRoleAfterOAuth(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
  fullName: string | null,
  avatarUrl: string | null,
) {
  const pending = takePendingRole();
  if (!pending) return;

  const role = mapUiRoleToDb(pending);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role,
      email: email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("profiles upsert", error);
    return;
  }

  if (role === "founder") {
    await supabase.from("founder_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
  } else {
    await supabase.from("vc_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
  }
}
