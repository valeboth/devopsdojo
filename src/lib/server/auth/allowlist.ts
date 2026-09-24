/**
 * Signup allowlist (§15, ALLOWED_EMAILS).
 *
 * During private beta the app runs with a comma-separated list of permitted
 * addresses. An unset or empty variable means signups are open — that is a
 * deliberate default for the public launch, so the gate is opt-in.
 *
 * Only *signup* is gated. Users who already exist keep signing in even if the
 * list later changes, because revoking access is a separate, explicit action.
 */
export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isEmailAllowed(email: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return true;
  const normalized = email.trim().toLowerCase();
  const domain = normalized.slice(normalized.lastIndexOf('@'));
  return allowlist.some((entry) =>
    // '@example.com' allows a whole domain; anything else is an exact address.
    entry.startsWith('@') ? domain === entry : entry === normalized,
  );
}
