// In-memory per-email failed-login tracker for the admin Credentials
// provider (see security-baseline.md's "fail closed on repeated bad
// attempts" requirement). Module-level Map is fine at this project's scale
// — single Node process on the VPS, one admin account — same "in-memory is
// fine at this scale" stance already applied to rate limiting elsewhere
// (api-conventions.md). State resets on process restart; acceptable here
// since the goal is slowing down a live brute-force run, not permanent
// banning.
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

interface ThrottleEntry {
  failures: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, ThrottleEntry>();

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

export function isLoginLocked(email: string): boolean {
  const entry = attempts.get(keyFor(email));
  return !!entry?.lockedUntil && Date.now() < entry.lockedUntil;
}

export function recordLoginFailure(email: string): void {
  const key = keyFor(email);
  const entry = attempts.get(key) ?? { failures: 0, lockedUntil: null };
  entry.failures += 1;

  if (entry.failures >= MAX_ATTEMPTS) {
    const extraLockouts = entry.failures - MAX_ATTEMPTS;
    const lockoutMs = Math.min(BASE_LOCKOUT_MS * 2 ** extraLockouts, MAX_LOCKOUT_MS);
    entry.lockedUntil = Date.now() + lockoutMs;
  }

  attempts.set(key, entry);
}

export function recordLoginSuccess(email: string): void {
  attempts.delete(keyFor(email));
}
