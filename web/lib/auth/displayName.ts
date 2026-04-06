import type { User } from "@supabase/supabase-js";

function capitalizeWord(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * First name for UI: Google `given_name`, else first word of full name, else local part of email (before @, first segment by . _ -).
 */
export function getFirstNameFromUser(user: User | null | undefined): string {
  if (!user) return "there";

  const meta = user.user_metadata ?? {};
  if (typeof meta.given_name === "string" && meta.given_name.trim()) {
    const w = meta.given_name.trim().split(/\s+/)[0];
    if (w) return capitalizeWord(w);
  }

  const full =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  if (full) {
    const w = full.split(/\s+/)[0];
    if (w) return capitalizeWord(w);
  }

  const email = user.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (!local) return "there";

  const firstSegment = local.split(/[._-]/)[0] ?? local;
  return capitalizeWord(firstSegment);
}
