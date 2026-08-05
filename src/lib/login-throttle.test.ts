import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "./login-throttle";

// Each test uses its own email so the module-level Map doesn't leak state
// between tests (there's no exported reset — that's intentional, it mirrors
// the real single-process lifetime).
let counter = 0;
function freshEmail() {
  return `throttle-test-${counter++}@example.com`;
}

describe("login-throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not locked before any failures", () => {
    expect(isLoginLocked(freshEmail())).toBe(false);
  });

  it("is not locked after a few failures below the threshold", () => {
    const email = freshEmail();
    recordLoginFailure(email);
    recordLoginFailure(email);
    expect(isLoginLocked(email)).toBe(false);
  });

  it("locks after 5 failures", () => {
    const email = freshEmail();
    for (let i = 0; i < 5; i++) recordLoginFailure(email);
    expect(isLoginLocked(email)).toBe(true);
  });

  it("is case-insensitive and trims whitespace on the email key", () => {
    const email = freshEmail();
    for (let i = 0; i < 5; i++) recordLoginFailure(email);
    expect(isLoginLocked(`  ${email.toUpperCase()}  `)).toBe(true);
  });

  it("unlocks after the lockout window passes", () => {
    const email = freshEmail();
    for (let i = 0; i < 5; i++) recordLoginFailure(email);
    expect(isLoginLocked(email)).toBe(true);

    vi.advanceTimersByTime(31_000);
    expect(isLoginLocked(email)).toBe(false);
  });

  it("clears the failure count on a successful login", () => {
    const email = freshEmail();
    for (let i = 0; i < 4; i++) recordLoginFailure(email);
    recordLoginSuccess(email);

    // One more failure post-success should not immediately lock — the
    // counter was reset, not just the lock timer.
    recordLoginFailure(email);
    expect(isLoginLocked(email)).toBe(false);
  });
});
