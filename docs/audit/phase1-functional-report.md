# Phase 1 — Functional Testing Report

**Date:** 2026-08-05
**Environment:** Isolated `chaitanya_audit_test` Postgres DB, Next.js dev server on `http://localhost:3100`, seeded baseline (4 categories / 8 products). Never touched the real dev DB or production.
**Agents:** 1A (unit), 1B (integration), 1C (Playwright E2E), 1D (edge cases/concurrency) — all ran in parallel against the shared test environment.

**Environment note:** because all four agents mutated the same shared test DB concurrently, some cross-contamination occurred (e.g. 1C observed product counts changing mid-session, and encountered leftover categories from 1D/1B's boundary-string tests). This is a testing artifact of parallel execution against one shared DB, not an application bug — flagged in the raw agent reports, not re-reported as a defect here.

---

## Coverage delivered

| Layer | New test files | Test count | Result |
|---|---|---|---|
| Unit (1A) | 17 new + 3 expanded, under `src/lib/`, `src/hooks/` | 308 tests / 35 files | ✅ all pass; `tsc`/`eslint` clean |
| Integration (1B) | 19 `*.route.integration.test.ts`, co-located with routes, + `src/test/apiIntegrationHelpers.ts` | 128 tests | ✅ all pass (run with `--fileParallelism=false`, see note below) |
| Edge cases/concurrency (1D) | `tests/edge-cases/{helpers,concurrency,auth-state,encoding-boundary,contact-oversized-payload}.test.ts` | ~20 tests | 544/546 of full suite pass (2 intentionally-documented, not erroring) |
| E2E (1C, Playwright) | Manual scripted flows, screenshots in scratchpad | ~30 flows | See table below |

**CI follow-up:** integration tests must be run with `npx vitest run integration --fileParallelism=false` — running all files under default parallelism lets two files race over the same `ShopLocation`/`FestivalBanner` table and produces a spurious failure (confirmed as a test-harness artifact, not an app bug, since the underlying race *is* a real app bug — see Finding #1 below — just not deterministically reproducible via naive parallel file execution).

---

## Confirmed Bugs (carried into Phase 4 backlog)

| # | Bug | Severity | Source | Fix |
|---|---|---|---|---|
| 1 | `ShopLocation.isPrimary` "exactly one primary" invariant breaks under concurrent writes (3–6 rows ended up primary across repeated runs of 6 concurrent POSTs) | **High** | 1D | Add Postgres partial unique index `WHERE "isPrimary" = true`; catch the resulting unique-violation in the transaction and return a clean 409 |
| 2 | `FestivalBanner.isActive` "at most one active" invariant breaks under concurrent writes, same root cause | **Medium** | 1D | Same pattern: partial unique index `WHERE "isActive" = true` |
| 3 | `PATCH /api/products/[id]` returns raw 500 (not 409) on a slug race — missing `P2002` catch that the sibling `POST` handler already has | **Medium** | 1D | Wrap PATCH's update in the same `try/catch (P2002)` pattern used in `POST /api/products` |
| 4 | `DELETE /api/products/[id]`, `DELETE /api/categories/[id]`, `PATCH /api/categories/[id]` return raw 500 (not 404) for a nonexistent id — no existence check before `.delete()`/`.update()` | **Medium** | 1B | `findUnique` before delete/update, return 404 if null — mirrors the pattern already correct in `shop-locations/[id]` and `festival-banners/[id]` |
| 5 | `POST /api/products` with a nonexistent `categoryId` returns raw 500 (FK violation), not 400/404 | **Medium** | 1B | Pre-check `prisma.category.findUnique`, same pattern as existing slug/sku conflict checks |
| 6 | `CategoryForm`/`ProductForm` description field: exceeding max length shows an invalid border but **no error text** — form silently refuses to submit with no explanation to the user | **Medium** | 1C | Add `error={errors.description?.message}` to the `TextareaField` in both forms (confirmed missing in code, `CategoryForm.tsx:71-76`, `ProductForm.tsx:327-332`) |
| 7 | Public category page: long/unbroken description text overflows horizontally (`scrollWidth` 10120px vs 1280px viewport), stretching the entire page including header/footer | **Medium** (intermittent repro, but root cause confirmed in code) | 1C | Add `break-words`/`overflow-wrap` class to the description `<p>` in `src/app/(site)/categories/[slug]/page.tsx:55` |
| 8 | Admin categories list: a very long unbroken category name pushes the Edit/Delete buttons off-screen (confirmed via DOM bounding box past viewport edge on desktop; fully off-screen with no horizontal scroll on mobile) | **Medium** | 1C | Truncate/wrap category names in the admin list row, or make the actions column non-shrinking (`flex-shrink-0`) |
| 9 | Admin categories/products list sometimes shows stale data for several seconds after a create/delete completes server-side, despite optimistic-update code being present — self-corrects | **Low** | 1C | Investigate React Query `onMutate`/`onSettled` timing in `useCategoryMutations.ts` — not a data-loss bug, just a render-lag UX issue |
| 10 | Public `Footer` renders every `ShopLocation` address with no name/label and no display cap — with several similar-looking locations, the footer becomes an unreadable repeated block | **Low** | 1C | Add a location name/label per row and consider a display cap once multi-shop is real |
| 11 | `contactSchema.contactMethod` has no `.max()` — public unauthenticated endpoint accepts up to 1,000,000-character values silently (201) | **Low/Informational** | 1D (confirms Phase 0 §4 finding, now proven exploitable) | Add `.max(500)` or similar |

## Not new bugs (verified working / expected behavior)
- Category delete blocked (409) when products still reference it.
- `ShopLocation`/`FestivalBanner` "one primary/active" logic converges correctly under **sequential** (non-concurrent) operations — the bug is specifically about true concurrency.
- `products/generate-sku` race produces duplicate suggestions under concurrent reads, but the DB unique constraint + `POST`'s existing `P2002` handling prevents any actual data-integrity issue (UX-only retry, not a bug).
- Stale/corrupted/missing session cookies → clean 401s, never 500s.
- JWT replay after login "still works" — expected behavior for stateless NextAuth JWT sessions, not a bug.
- Unicode/emoji/RTL/Devanagari/Arabic text round-trips correctly through create→fetch.
- SQL-metacharacter strings (`' OR '1'='1`, `"; DROP TABLE products; --`) are stored/rendered as inert text — Prisma parameterization holds, confirmed via both direct DB tests and the public `q` search param.
- Upload magic-byte sniffing genuinely rejects spoofed-type files (text content with an image extension/MIME).
- Zod length boundaries (exactly at max = pass, max+1 = fail) hold precisely where tested.

## E2E Flow Matrix (Phase 1C highlights — full detail in raw agent report)

All public-site flows (homepage, category→product navigation, WhatsApp/Email/Call links, 404 handling, empty states) passed at both 375px and 1280px viewports with zero console errors. All 11 protected admin routes correctly redirect to login both with no cookie and with a garbage/expired cookie. Sign-in valid/invalid credentials both behave correctly. Product/category CRUD, image upload validation (type/size), and variant handling all passed functionally — the five bugs above are UI/UX polish issues found *during* otherwise-passing flows, not flow-blocking failures.

**Not verified this pass** (flagged, not failures): festival banner active-state homepage rendering (no active banner existed in test data), full ShopLocation primary-swap UI click-through, hero image upload → homepage carousel, festival banner video upload, enquiries mark-complete toggle action.

---

*Full raw reports from each sub-agent (1A/1B/1C/1D) are preserved in the conversation history for detailed repro steps and evidence.*
