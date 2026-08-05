# Phase 3 — Performance & Resilience Report

**Date:** 2026-08-06
**Environment:** `next dev` (Turbopack) on `http://localhost:3100` against isolated `chaitanya_audit_test` DB (29 products, 34 categories at test time). Absolute latencies below are inflated relative to a production build (no minification, HMR overhead, dev instrumentation) — the *relative* degradation pattern is the real signal.

---

## Load test results

| Endpoint | Concurrency | p50 | p95 | max | Errors |
|---|---|---|---|---|---|
| `GET /` | 10 / 30 / 60 / 120 | 6.39s / 13.26s / 29.24s / 33.87s | — | — | 0 |
| `GET /products` | 10 / 30 / 60 / 120 | 4.21s / 11.07s / 24.50s / 55.66s | — | — | 0 |
| `GET /products/[slug]` | 10 / 30 / 60 / 120 | 5.24s / 11.87s / 22.40s / 57.74s | — | — | 0 |
| `GET /api/health` (no-DB baseline) | 10 / 30 / 60 / 120 | 0.17s / 0.22s / 0.48s / 0.78s | — | — | 0 |

Zero HTTP errors at any tested concurrency — the app degrades (queues), it doesn't crash. The contrast with the flat `/api/health` baseline isolates the cause to DB access, not general server load.

## Root cause: unconfigured Prisma connection pool (High)

`src/lib/prisma.ts:8` passes only `connectionString` to `PrismaPg`/`pg.Pool`, no explicit `max`. `pg-pool` defaults to **10 connections** for the entire process — shared across every public page render and every admin API call. Each tested page fires 2-4+ parallel Prisma queries per render; at concurrency 60 on `/products` that's 240+ simultaneous connection requests contending for 10 slots. This generalizes Phase 2D's `/api/contact` finding: it's systemic, not endpoint-specific.

**Fix:** set an explicit `max` sized to the deployment target's actual Postgres `max_connections`; consider PgBouncer/Prisma Accelerate for the stated Vercel target, since serverless invocations multiply connection pressure beyond what this single-process test shows.

## Duplicate per-request query on detail pages (Medium)

`src/app/(site)/products/[slug]/page.tsx` (`generateMetadata` at line 19, page body at 56-59) and `src/app/(site)/categories/[slug]/page.tsx` (line 14 and 36-41) each independently call the same `prisma.findUnique` with no `React.cache()` dedup — Next.js always invokes `generateMetadata` per request on a dynamic route, so this is a guaranteed 2x DB round-trip on every view of the app's actual conversion page. No loop-based N+1 was found anywhere else — list views correctly batch relations via `include` (e.g. `enquiries/route.ts` explicitly documents avoiding N+1 for the non-FK `productId`).

**Fix:** wrap the shared fetch in `React.cache()` — standard App Router pattern.

## Missing indexes (Low-Medium, future-proofing)

- `Product.featured` — no index, filtered on every homepage load (highest-traffic page). Harmless at 29 rows.
- `Product.createdAt` — no index despite being the `orderBy` on `/products`, `/categories/[slug]`, homepage, and admin products list.
- Suggested: composite `@@index([featured, createdAt])` for the homepage query, plus `@@index([categoryId, createdAt])`/`@@index([brand, createdAt])` once the catalog grows past a few hundred rows. Not urgent today.

## Unbounded result sets — confirmed capped, no bug

`src/lib/pagination.ts` clamps every list endpoint's `limit` to `MAX_PAGE_SIZE = 100` uniformly across all 5 list routes. Live-verified `?limit=999999`, `?limit=-1`, `?limit=0`, `?limit=abc` all handled safely. Public `/products` page doesn't even accept a user-supplied `limit`. No action needed.

## Graceful degradation when the DB is unreachable (Medium)

Tested via standalone throwaway scripts (not the running app) against a refused port and a black-holed IP — did not touch the shared Postgres container or the running app's config.

- **Active refusal** (`ECONNREFUSED`): fails in 23ms — maps cleanly onto the app's existing `error.tsx`/`global-error.tsx` boundaries, degrades gracefully.
- **Silent unreachability** (packets dropped, more realistic for a network partition): did not resolve within 5s — **no application-level connection timeout exists**. `src/lib/prisma.ts` sets no `connectionTimeoutMillis`. On the stated Vercel deployment target, this becomes an ungraceful platform-level timeout/504 instead of the friendly error path that already works for the fast-fail case.

**Fix:** set an explicit `connectionTimeoutMillis` (a few seconds) and ideally a Postgres `statement_timeout`, converting silent hangs into the same graceful error-boundary path that already works today.

---

*Full raw agent report preserved in conversation history for exact file/line references and live-verification evidence.*
