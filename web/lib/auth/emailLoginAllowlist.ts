/**
 * Optional password sign-in for known demo / QA accounts (bypasses Google OAuth).
 *
 * Set `NEXT_PUBLIC_CRUCIBLE_EMAIL_LOGIN_ALLOWLIST` to a comma-separated list of
 * emails (lowercase recommended). Only those addresses may use email/password on
 * the role screen. Leave unset or empty to hide the form (recommended for production).
 *
 * Supabase: enable Email provider; create users with password (e.g. seed SQL) or Dashboard.
 *
 * Auth user UUIDs are not known before sign-in — use emails here. Seed demo IDs map to:
 *   feed-demo-founder1@crucible.test → a1111111-1111-4111-8111-111111111111
 *   feed-demo-founder2@crucible.test → a2222222-2222-4222-8222-222222222222
 *   feed-demo-vc@crucible.test       → b3333333-3333-4333-8333-333333333333
 */
export function getEmailLoginAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_CRUCIBLE_EMAIL_LOGIN_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.includes("@"));
}

export function isEmailLoginAllowed(email: string, allowlist: string[]): boolean {
  const e = email.trim().toLowerCase();
  return allowlist.length > 0 && allowlist.includes(e);
}
