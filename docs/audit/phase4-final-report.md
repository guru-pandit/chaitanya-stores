# Phase 4 — Final Report & Remediation Plan

**Date:** 2026-08-06
**Scope:** Chaitanya Stores — full-stack QA and security audit (Phases 0-3), tested against an isolated local `chaitanya_audit_test` Postgres DB and dev server. Production and the real dev DB were never touched.
**Companion documents:** [phase0-attack-surface.md](phase0-attack-surface.md) · [phase1-functional-report.md](phase1-functional-report.md) · [phase2-security-report.md](phase2-security-report.md) · [phase3-performance-report.md](phase3-performance-report.md)

---

## Executive summary

No critical, actively-exploitable vulnerability was found. The app's core security posture is solid: **zero SQL injection, XSS, command/path injection, CSRF-via-forced-navigation, or broken access control** was found anywhere across the full route map, and session/JWE handling rejected 100% of tampering attempts. The two npm-audit critical CVEs (`next-auth`/`@auth/core`) are either not reachable in this app's usage or reachable-but-not-currently-exploitable given its single-admin, no-registration model.

What the audit did surface: a **latent fail-open auth pattern** repeated across 28 API route call sites (highest-priority fix, cheap), a **genuine concurrency bug** in two "exactly one" business invariants (`ShopLocation.isPrimary`, `FestivalBanner.isActive`), a handful of **unhandled-500 correctness bugs** on not-found/conflict paths, **no CSRF backstop or rate limiting** on state-changing/public routes, and a **systemic performance bottleneck** (unconfigured DB connection pool) that explains multiple endpoints' behavior under load, not just one. Five real **UI/UX bugs** were also found by the E2E pass. Test coverage was substantially expanded (308 new/verified unit tests, 128 integration tests, ~20 edge-case/concurrency tests, all committed to the repo).

**58 net findings** across all phases (after removing duplicates/overlaps between agents): 0 confirmed-critical-and-exploitable, 1 high (latent), 6 medium (security), 4 medium (functional/data-integrity), 2 medium (performance), remainder low/informational. Full detail below; items are ordered **security first, then functional blockers, then everything else**, per the audit's own ordering rule.

---

## Prioritized backlog

### Tier 1 — Security

| # | Finding | Severity | Effort | Regression test needed? | Owner | Source |
|---|---|---|---|---|---|---|
| 1 | 28 API route call sites use `if (!session) return 401` instead of `if (!session?.user)` — fails open to unauthenticated CRUD if NextAuth's `auth()` ever returns a truthy config-error object instead of `null` | **High** (latent, not currently triggered) | S | Yes — add a test asserting a mocked config-error-shaped session is rejected | Backend | 2C |
| 2 | `next-auth`/`@auth/core` 0.41.2: 2 critical + 1 high CVE. Homoglyph-`@` normalizer bypass live-confirmed reachable but not currently exploitable (no registration/OAuth in this app); Bearer-header CVE confirmed not reachable (cookie sessions only) | Medium (confirmed, low practical impact) | S — `npm update next-auth`, zero risk, satisfies existing `^5.0.0-beta.31` range | Smoke-test login after upgrade | Backend | 2A, 2C |
| 3 | `sharp`/libvips CVE confirmed **runtime-reachable** via `next/image` processing admin-uploaded product/banner images | Medium | M — requires `next@16.3.0` (minor bump), needs its own review of the 16.2→16.3 changelog | Yes — re-run full test suite + manual image-upload smoke test after upgrade | Backend | 2C |
| 4 | No server-side CSRF protection (Origin/Referer check) on any mutating API route — live-reproduced successful cross-origin POST/PATCH/DELETE with a valid session cookie. Currently protected only by browser-enforced `SameSite=Lax`, no server-side backstop | Medium | S-M — add an Origin/Referer allow-list check, e.g. centralized in `proxy.ts` or a shared helper called from each mutating route | Yes | Backend | 2D |
| 5 | No rate limiting on public `POST /api/contact` — 60 concurrent requests all succeeded; burst measurably degrades response times ~6x more than a non-DB baseline (connection-pool contention, ties to Tier 3 #1) | Medium-High | S-M — reuse the existing `login-throttle.ts` in-memory pattern, keyed by IP | Yes | Backend | 2D |
| 6 | No rate/quota limit on file uploads — ~1.9GB/min possible from one authenticated session, a real disk-fill DoS vector on the single-VPS deployment | Low-Medium | S-M — same in-memory throttle pattern, keyed by session | Yes | Backend | 2D |
| 7 | `productSchema.images` / `festivalBannerSchema.mediaPath` / `siteSettingsSchema.heroImages` accept arbitrary strings — traced consequence: malformed Open Graph/JSON-LD tags, and a `javascript:` value crashes `next/image`'s SSR validation (safely, but ungracefully) | Low | S — constrain to `/^\/uploads\//` or `z.url()` in the three validation files | Already partially covered by 1B's integration tests | Backend | 1B, 2B |
| 8 | Timing side-channel: login only runs `bcrypt.compare` when the email exists, enabling theoretical user enumeration via response timing | Low (suspected, code-confirmed but timing evidence noisy) | S — run a dummy `bcrypt.compare` against a fixed hash on the not-found path | Nice-to-have | Backend | 2A |
| 9 | `contactSchema.contactMethod` has no `.max()` — public endpoint accepts up to 1,000,000-char values silently, a cheap DB-bloat vector | Low | S — add `.max(500)` or similar | Yes — trivial | Backend | 1D, 2B |
| 10 | `X-Powered-By: Next.js` header leaks framework fingerprinting, not stripped by nginx | Low | S — `poweredByHeader: false` in `next.config.ts` | No | Backend | 2C |
| 11 | `.next/standalone/.env` contains real secrets verbatim on a bare non-Docker `npm run build` (confirmed NOT reachable via the actual Docker/CI deploy path — `.dockerignore` correctly excludes `.env*`) | Low, environment-specific | S — one-line README note not to ship `.next/standalone` outside a Docker build context | No | Docs | 2C |

### Tier 2 — Functional blockers (data integrity / correctness)

| # | Finding | Severity | Effort | Regression test needed? | Owner | Source |
|---|---|---|---|---|---|---|
| 12 | `ShopLocation.isPrimary` "exactly one primary" invariant breaks under concurrent writes — confirmed 3-6 rows ended up primary across repeated 6-way concurrent POST tests. App-level `$transaction` alone can't serialize this | **High** (data integrity) | M — add a Postgres partial unique index (`WHERE "isPrimary" = true`), catch the resulting unique-violation and return a clean 409 | Yes — the concurrency test already exists in `tests/edge-cases/concurrency.test.ts`, currently documents the bug; should assert the fix once applied | Backend | 1D |
| 13 | `FestivalBanner.isActive` "at most one active" invariant breaks under the same concurrency pattern | Medium | M — same fix pattern, partial unique index `WHERE "isActive" = true` | Yes — same test file | Backend | 1D |
| 14 | `PATCH /api/products/[id]` returns raw 500 (not 409) on a slug race — missing the `P2002` catch that sibling `POST` already has | Medium | S — wrap in the same `try/catch` pattern used in `POST /api/products` | Yes — covered by `tests/edge-cases/concurrency.test.ts` | Backend | 1D |
| 15 | `DELETE`/`PATCH /api/products/[id]`, `DELETE /api/categories/[id]` return raw 500 (not 404) for a nonexistent id — no existence check before the Prisma call | Medium | S — `findUnique` before delete/update, mirrors the already-correct pattern in `shop-locations/[id]`/`festival-banners/[id]` | Yes — covered by 1B's `*.route.integration.test.ts` files (currently document the bug) | Backend | 1B |
| 16 | `POST /api/products` with a nonexistent `categoryId` returns raw 500 (FK violation), not 400/404 | Medium | S — pre-check `prisma.category.findUnique`, same pattern as existing slug/sku conflict handling | Yes — covered by 1B's integration tests | Backend | 1B |

### Tier 3 — Everything else (performance, UI/UX, hardening)

| # | Finding | Severity | Effort | Regression test needed? | Owner | Source |
|---|---|---|---|---|---|---|
| 17 | Unconfigured Prisma connection pool (defaults to 10) — systemic root cause behind DB-backed pages/routes degrading under load (confirmed via `/api/health` baseline staying flat at the same concurrency) | **High** (perf) | S — set an explicit `max`/`connection_limit` sized to the deployment target; consider PgBouncer/Prisma Accelerate for the stated Vercel target | Yes — re-run Phase 3's load-test script after tuning | Backend/Infra | 3, 2D |
| 18 | `/products/[slug]` and `/categories/[slug]` each issue their core Prisma query twice per request (`generateMetadata` + page body, no `React.cache()` dedup) — doubles DB load on the app's actual conversion page | Medium | S — wrap the shared fetch in `React.cache()` | Yes | Frontend | 3 |
| 19 | No application-level DB connection timeout — an actively-refused connection fails gracefully (23ms, existing error boundaries catch it), but a silently-unreachable DB hangs indefinitely with no timeout, risking an ungraceful platform-level cutoff on Vercel | Medium | S — set `connectionTimeoutMillis` (a few seconds) and ideally a Postgres `statement_timeout` | Nice-to-have (hard to test without infra to simulate a black-holed connection) | Backend | 3 |
| 20 | `CategoryForm`/`ProductForm` description field: exceeding max length shows an invalid border but no error text — silent form-submission failure | Medium | S — add `error={errors.description?.message}` to both `TextareaField`s | Yes | Frontend | 1C |
| 21 | Public category page: long/unbroken description overflows horizontally, stretching the entire page (confirmed via `scrollWidth` measurement, intermittent repro but root cause confirmed in code) | Medium | S — add `break-words`/`overflow-wrap` class | Yes | Frontend | 1C |
| 22 | Admin categories list: a very long unbroken category name pushes Edit/Delete buttons off-screen (confirmed via DOM bounding box past viewport, worse on mobile — no horizontal scroll fallback) | Medium | S — truncate/wrap name or make the actions column `flex-shrink-0` | Yes | Frontend | 1C |
| 23 | Missing indexes on `Product.featured` and `Product.createdAt` — every homepage/listing query filters or sorts on these with no supporting index. Harmless at current catalog size (29 products) | Low-Medium (future-proofing) | S — migration adding `@@index([featured, createdAt])` etc. | No (perf regression, not correctness) | Backend | 3 |
| 24 | Admin categories/products list sometimes shows stale data for several seconds after create/delete despite optimistic-update code — self-corrects, not a data-loss bug | Low | M — investigate React Query `onMutate`/`onSettled` timing in `useCategoryMutations.ts` | Nice-to-have | Frontend | 1C |
| 25 | Public `Footer` renders every `ShopLocation` address with no name/label and no display cap — unreadable once there are several similar addresses | Low | S-M — add a per-location label, consider a display cap | No | Frontend | 1C |
| 26 | `TRACE` HTTP method triggers a dev-mode 500 with a full stack trace — confirmed Next.js/undici core behavior (throws before any app code runs), dev-mode only | Informational | — | No | — | 2A |
| 27 | CI note: integration test suite must run with `npx vitest run integration --fileParallelism=false` — default parallelism lets concurrent test files race over the same `ShopLocation`/`FestivalBanner` table (a test-harness artifact, ironically caused by the same real concurrency bug at #12/#13) | — | S — update the `test` script or CI config | — | CI | 1A, 1B |

---

## Test coverage delivered (committed to the repo)

| Suite | Location | Count |
|---|---|---|
| Unit | Co-located `src/lib/**/*.test.ts`, `src/hooks/**/*.test.tsx` | 308 tests / 35 files (17 new, 3 expanded) |
| Integration | Co-located `src/app/api/**/*.route.integration.test.ts` + `src/test/apiIntegrationHelpers.ts` | 128 tests / 19 files |
| Edge cases / concurrency | `tests/edge-cases/*.test.ts` | ~20 tests |
| E2E | Manual Playwright-scripted flows (not committed as a suite — recorded findings only, per the e2e-qa agent's "record, don't fix" mandate) | ~30 flows |

**Run order for CI**: `npm test` runs everything via Vitest; integration tests specifically need `--fileParallelism=false` (item #27) until the underlying concurrency bugs (#12/#13) are fixed with DB-level constraints, at which point the race condition — and the need for the flag — goes away naturally.

---

## What was confirmed safe (no action needed)

SQL injection (no raw SQL anywhere), XSS (React's default escaping holds everywhere tested), command/path injection (no shell-out, upload filenames always UUID'd), SSRF (no server-side fetch with user-controlled targets, no `rewrites()` configured), JWE session tampering (100% rejected, no `alg:none` vector), session fixation, broken access control (every route correctly gated against auth/path-variation/method bypass attempts), login throttle (works as designed, not evadable via homoglyph cycling), pagination (properly capped at 100 everywhere), CORS (no reflected Origin), production security headers (correctly configured in nginx, confirmed deliberate), secrets in source/client bundle (clean).

---

## Suggested next steps

1. Fix Tier 1 items #1-2 (session check pattern + `npm update next-auth`) — cheapest, highest-leverage, zero functional risk.
2. Fix Tier 2 items #12-16 — these are real data-integrity bugs an admin could hit today through normal (even accidental double-click) usage, not just adversarial testing.
3. Fix Tier 3 #17-18 (connection pool + duplicate query) — cheap, and the load-test script from Phase 3 can directly verify the fix.
4. Batch the remaining Tier 1/3 UI and hardening items into a normal sprint; none are urgent in isolation.
5. Revisit the `next@16.3.0` decision (#3) separately, since it's a minor-version bump that deserves its own changelog review rather than being bundled into a quick-fix batch.
6. Tear down the audit's local artifacts when convenient: `docker exec invoice-app-postgres psql -U invoice -d postgres -c "DROP DATABASE chaitanya_audit_test;"`, remove `.env.audit`, stop the port-3100 dev server. None of this affects the real dev DB or production.

---

*This report and its four phase companions are the complete deliverable for this audit. Raw sub-agent transcripts with full reproduction detail and evidence are preserved in this conversation's history.*
