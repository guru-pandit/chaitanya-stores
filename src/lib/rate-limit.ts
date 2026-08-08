import { NextRequest, NextResponse } from "next/server";

// In-memory, fixed-window rate limiting — same "in-memory is fine at this
// scale" stance already applied to login throttling (see
// src/lib/login-throttle.ts): a single Node process on the VPS, low
// traffic, no need for Redis/edge-config infra. State resets on process
// restart, which is acceptable here since the goal is capping abuse
// bursts, not permanent banning.
//
// Phase 4 audit findings #5/#6:
//   - #5: no rate limiting on public POST /api/contact — 60 concurrent
//     requests all succeeded.
//   - #6: no rate/quota limit on file uploads — ~1.9GB/min possible from
//     one authenticated session, a real disk-fill DoS vector on the
//     single-VPS deployment.

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry. 0 when `allowed` is true. */
  retryAfterSeconds: number;
}

// How often each limiter sweeps its own bucket map for expired entries —
// see RateLimiter.check's sweep call below. Independent of any individual
// limiter's window length; just needs to be frequent enough that expired
// entries from IP/session churn (e.g. rotating source IPs hitting
// /api/contact) don't accumulate unboundedly for the process lifetime.
const SWEEP_INTERVAL_MS = 5 * 60_000;

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweptAt = Date.now();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  // Opportunistic sweep run from within check() rather than a setInterval —
  // avoids a timer that would keep the Node process alive / need manual
  // teardown in tests. Piggybacks on real request traffic instead.
  private sweepExpired(now: number): void {
    if (now - this.lastSweptAt < SWEEP_INTERVAL_MS) return;
    this.lastSweptAt = now;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  check(key: string): RateLimitResult {
    // Test-only escape hatch — see .env.example's warning. Never set this
    // in production; it exists purely so the existing integration/edge-case
    // test suites (which fire many requests in quick succession against a
    // shared audit server) can opt out instead of the limiters below being
    // loosened to the point of meaninglessness.
    if (process.env.RATE_LIMIT_DISABLED === "true") {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const now = Date.now();
    this.sweepExpired(now);
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count < this.limit) {
      bucket.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
}

// POST /api/contact — IP-keyed, public/unauthenticated. 20 requests per
// 10-minute window: generous enough that a genuine visitor retrying a
// submission a few times (typos, a flaky connection, resubmitting after
// fixing a validation error) never gets blocked, while still capping the
// kind of unthrottled burst the audit reproduced (60 concurrent requests
// all succeeding) down to a small fraction of that.
const CONTACT_LIMIT = 20;
const CONTACT_WINDOW_MS = 10 * 60_000;
export const contactRateLimiter = new RateLimiter(CONTACT_LIMIT, CONTACT_WINDOW_MS);

// POST /api/upload and POST /api/upload/video — session-user-keyed, and
// deliberately share ONE bucket between the two routes (an admin uploading
// 6 images then a couple of banner videos in the same editing session
// should feel like one budget, and a real disk-fill ceiling has to count
// bytes from both endpoints together, not per-route). 15 uploads per
// 15-minute window comfortably covers a real editing session (~5-8 images)
// with room for retries, while capping the worst case at roughly
// 15 * 20MB = 300MB per window instead of the audit's observed ~1.9GB/min.
const UPLOAD_LIMIT = 15;
const UPLOAD_WINDOW_MS = 15 * 60_000;
export const uploadRateLimiter = new RateLimiter(UPLOAD_LIMIT, UPLOAD_WINDOW_MS);

// POST /api/log-client-error — IP-keyed, public/unauthenticated, no DB
// write (just forwards into the server log stream — see that route's own
// comment). Security review finding (Phase 4 review, not the original
// audit): this route was missed by the initial #5/#6 rollout despite being
// a public mutating endpoint. 30 requests per 10-minute window: a genuinely
// buggy release can legitimately fire more client-side error reports per
// visitor than a contact-form submission ever would (e.g. a render loop
// re-throwing on every re-render), so this is deliberately looser than
// contactRateLimiter rather than reusing it outright.
const CLIENT_ERROR_LIMIT = 30;
const CLIENT_ERROR_WINDOW_MS = 10 * 60_000;
export const clientErrorRateLimiter = new RateLimiter(CLIENT_ERROR_LIMIT, CLIENT_ERROR_WINDOW_MS);

/**
 * Best-effort client IP extraction behind nginx (see architecture.md's
 * deployment target).
 *
 * x-real-ip is preferred over x-forwarded-for: nginx/templates/default.conf.template
 * sets both via `proxy_set_header ... $remote_addr` (never appending), so
 * either is safe today, but x-real-ip has no multi-value/append convention
 * at all — trusting "first entry of a comma list" for x-forwarded-for is
 * only sound because of that nginx config, a coupling nothing enforces. If
 * you change how either header is set in the nginx template, keep this
 * function's assumption in sync.
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
