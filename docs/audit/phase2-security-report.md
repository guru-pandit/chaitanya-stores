# Phase 2 — Security Testing Report

**Date:** 2026-08-05
**Environment:** Isolated `chaitanya_audit_test` Postgres DB, Next.js dev server on `http://localhost:3100`. Never touched production or the real dev DB. All test artifacts (enquiry rows, uploaded files, test categories/products, sessions) created during testing were cleaned up and verified removed, except where noted.
**Agents:** 2A (AuthN/AuthZ), 2B (injection/input handling), 2C (dependency/config), 2D (CSRF/rate-limiting/abuse) — ran in parallel.
**Framing:** authorized, sanctioned defensive testing of the developer's own local instance.

---

## Findings, ranked by severity

| # | Finding | Severity | OWASP | Source | Status |
|---|---|---|---|---|---|
| 1 | **API routes use `if (!session)` instead of `if (!session?.user)` at 28 call sites** — if NextAuth's `auth()` ever returns a truthy-but-invalid object (its documented behavior on a config error), every admin API route fails open to unauthenticated CRUD. Currently latent, not actively triggered. | **High** (latent) | A07:2021 | 2C | Confirmed by code review |
| 2 | `next-auth`/`@auth/core` 0.41.2 has 2 critical + 1 high CVE. One (email homoglyph `@` normalizer) is live-confirmed reachable in the login flow but doesn't currently enable an auth bypass given this app's single-admin/no-registration model; login throttle unaffected by homoglyph cycling. | **Medium** (confirmed live, low practical impact) | A06:2021 | 2A, 2C | Confirmed — zero-risk fix available (`npm update next-auth`) |
| 3 | `sharp`/libvips CVE — confirmed **runtime-reachable**, not just build-time: `next/image` processes admin-uploaded product/banner images through `sharp` at request time. Only fixed by `next@16.3.0` (minor bump, needs its own review). | **Medium** | A06:2021 | 2C | Confirmed reachable |
| 4 | **CSRF**: no server-side Origin/Referer check on any mutating API route. Live-reproduced successful `POST`/`PATCH`/`DELETE` with a valid session cookie + forged `Origin: evil.example.com`. Protection currently depends entirely on browser-enforced `SameSite=Lax`, with no server-side backstop. | **Medium** | A01:2021 | 2D | Confirmed |
| 5 | **No rate limiting on `POST /api/contact`** (public, unauthenticated). 60 concurrent requests all succeeded; burst measurably degraded response times ~6x more than a non-DB endpoint under equivalent load — plausible connection-pool contention that could slow other DB-backed routes app-wide. | **Medium-High** | A04:2021 | 2D | Confirmed, with timing evidence |
| 6 | **No upload rate/quota limit** — 15 sequential 5MB uploads completed in ~2.3s; extrapolates to ~1.9GB/min from one authenticated session, a real disk-fill DoS vector on a single-VPS deployment. | **Low-Medium** | A04:2021 | 2D | Confirmed |
| 7 | `productSchema.images`/`festivalBannerSchema.mediaPath` accept arbitrary strings (already known from Phase 0/1). Traced actual consequence: malformed values leak into Open Graph/JSON-LD tags as broken URLs, and a `javascript:` value crashes `next/image`'s SSR validation (safely, not exploitably — the crash *is* the safety net, but it's a robustness bug). | **Low** | A03:2021 | 2B | Confirmed, low impact |
| 8 | Timing side-channel between "unknown email" and "known email, wrong password" login attempts (bcrypt only runs when the email exists) — theoretically enables user enumeration via timing. Noisy on the dev server, mechanism is real. | **Low** | A07:2021 | 2A | Suspected (code-confirmed, timing evidence noisy) |
| 9 | `X-Powered-By: Next.js` header leaks framework fingerprinting; not stripped by nginx's `server_tokens off` (that only hides nginx's own version). | **Low** | A05:2021 | 2C | Confirmed |
| 10 | `TRACE` HTTP method triggers a dev-mode 500 with a full stack trace including absolute filesystem paths — this is Next.js/undici core behavior (throws before any route/auth code runs), not app code, and dev-mode-only. | **Low** | A05:2021 | 2A | Confirmed, not app-specific |
| 11 | `.next/standalone/.env` contains real dev secrets verbatim when built via a bare `npm run build` outside Docker (Next's standalone output copies whatever `.env` exists at build time). Confirmed **not** reachable via the actual Docker/CI deploy path (`.dockerignore` excludes `.env*` from the build context). Residual risk only for ad-hoc non-Docker builds. | **Low**, environment-specific | A05:2021 | 2C | Confirmed, mitigated in the real deploy path |
| 12 | `DELETE`/`PATCH` 500s (already found in Phase 1) confirmed to leak **zero** stack trace/internals to the client — opaque empty body only. Robustness gap, not an information-disclosure vulnerability. | Informational | A05:2021 | 2C | Confirmed safe |

## Confirmed NOT exploitable / not applicable (negative results — valuable, not filler)

- **Classic SQL injection**: not applicable — zero raw SQL (`$queryRaw`/`$executeRaw`) anywhere in the codebase; Prisma's query builder used everywhere. Live-reconfirmed with `'; DROP TABLE "Enquiry"; --'`.
- **XSS (reflected/stored/DOM)**: no exploitable surface. Live-tested `<script>`/`onerror` payloads across product/category/contact fields — React's default escaping holds everywhere. Only `dangerouslySetInnerHTML` usages are the standard-safe JSON-LD serialization pattern.
- **Command/path injection**: no exploitable surface — zero `exec`/`spawn` calls in the app; upload filenames always discarded for `crypto.randomUUID()`, confirmed live against 5 adversarial payloads including null bytes and encoded traversal.
- **SSRF**: not applicable — no server-side fetch with user-controlled targets; `next.config.ts` has no `rewrites()`, so the flagged `next` SSRF CVE has no reachable code path here.
- **Bearer-header CVE** (GHSA-xmf8-cvqr-rfgj): confirmed not reachable — app uses cookie-based JWE sessions exclusively, never parses `Authorization: Bearer`.
- **JWE session tampering**: 100% clean rejection across signature-flip, ciphertext-flip, truncation, and fabricated `alg:none` variants — never a 500, never silently accepted. No session fixation (each login issues a distinct token).
- **Broken access control**: every route in the Phase 0 map correctly gated, including path-variation bypass attempts (trailing/double slash, encoded slash, case variation, `_next/data` probes) and HTTP method variations against `src/proxy.ts`'s matcher.
- **`next` SVG Image-Optimization DoS, Server-Function endpoint disclosure**: not applicable — no SVG upload path exists (magic-byte allow-list), no Server Actions anywhere in the app (`grep "use server"` → zero matches).
- **Login throttle**: works as designed — 5 failed attempts trigger lockout, successful login resets the counter, homoglyph-email cycling does not evade it.
- **`/api/log-client-error` under burst**: confirmed harmless — no DB writes, flat latency under 80 concurrent requests.
- **Secrets in source/client bundle**: clean — only fake test-fixture strings found in source; `.next/static/` client output grepped clean for real secret values.
- **Security headers in production**: correctly configured via nginx (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all present) — confirmed deliberate split from `next.config.ts` (which has no `headers()` block), not an oversight.
- **CORS**: no `Access-Control-Allow-Origin` reflected even with a forged `Origin` header on any API route — correct default (no cross-origin API access possible).

---

## CVE Disposition Summary (from Phase 0's raw `npm audit`)

| Package | Verdict | Action |
|---|---|---|
| `next-auth`/`@auth/core` (2 critical, 1 high, 1 moderate) | One live-confirmed but low-impact; rest not reachable or n/a (no OAuth) | `npm update next-auth` — zero-risk, satisfies existing `^5.0.0-beta.31` range |
| `next` — SSRF/SVG-DoS/Server-Function-disclosure/cache-confusion (high/critical mix) | All confirmed not reachable in this app's actual usage | Free patch bump to `next@16.2.11` closes 6 of 9 findings anyway |
| `next` optionalDependency `sharp`/libvips (high) | **Confirmed runtime-reachable** via `next/image` processing admin-uploaded images | Only fixed at `next@16.3.0` (minor bump) — needs a scoped upgrade decision, not `--force` |
| `postcss` (high, transitive via `next` and separately via Tailwind) | Build-time only; Tailwind's own copy already outside vulnerable range | Low priority |
| `prisma` (moderate) | Dev-tooling only, not runtime-exposed | No action needed |
| `valibot`, `hono`, `@hono/node-server`, `fast-uri`, `brace-expansion` | All confirmed transitive deps of Prisma dev tooling / ESLint — never touch the running app | No action needed |

**No dependency changes were made during this audit** — `npm audit fix --force` was deliberately not run, per the audit's global rules (destructive/version-changing actions require an explicit approved decision).

---

*Full raw reports from each sub-agent (2A/2B/2C/2D) are preserved in the conversation history for detailed repro steps, evidence, and file references.*
