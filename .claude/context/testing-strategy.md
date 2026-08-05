# Testing Strategy

## Stack
Vitest (or Jest) + React Testing Library for units/components. Prisma against a throwaway Postgres test database/schema for anything touching the database — the datasource provider is fixed to `postgresql` (see `architecture.md`), so a SQLite test DB is no longer an option in any environment, tests included. No E2E framework configured yet — manual QA covers full flows at this project's size; add Playwright later if the admin dashboard grows complex enough to warrant it.

## Test Pyramid
```
        [ Manual QA ]        — full user flows, both public site and admin dashboard
      [ Integration ]        — API routes against a test Postgres DB, Zod schemas
    [   Unit Tests   ]       — pure helpers (site-config link builders, slugify, price formatting)
```

## Coverage Priorities
| Layer | Priority |
|-------|---------|
| `src/lib/validations/` | High — Zod schemas are the correctness backbone for every form and API route |
| `src/lib/site-config.ts` helpers (WhatsApp/mailto/tel link builders) | High — core conversion mechanic, easy to unit test, easy to silently break |
| `src/app/api/*/route.ts` | High — auth gate + validation + Prisma call, test happy path + 401 + 400 |
| `src/hooks/` (React Query) | Medium — mock `fetch`, assert cache invalidation on mutate |
| `src/components/` | Low — smoke test for anything with real logic (e.g. image gallery, filter UI); skip pure presentational components |
| Server Component pages | Low — covered by manual QA; hard to unit test meaningfully |

## Must-Have Tests
- Every Zod schema in `src/lib/validations/`: valid input passes, each required field's absence fails with the right message
- WhatsApp/mailto/tel link builders: correct URL encoding, correct pre-filled product name
- API routes: authenticated vs unauthenticated (`401`), valid vs invalid body (`201`/`400`), category delete blocked when products exist (`409`)
- Slug generation: uniqueness handling, safe character stripping

## Manual QA Checklist (per feature)
- Happy path on both desktop and mobile viewport
- Loading state visible during data fetch (admin) / no flash of unstyled content (public)
- Error state shown on API failure
- Empty state shown when no products/categories exist
- WhatsApp/Email/Call links open with correct pre-filled content
- Admin actions blocked when logged out (direct URL navigation to `/admin/products` while signed out redirects to login)
- Responsive at mobile (375px) and desktop (1280px) minimum

## Fixture Conventions
```ts
// src/__fixtures__/products.ts
export const mockProduct = {
  id: 'p1', name: 'Sandalwood Agarbatti', slug: 'sandalwood-agarbatti',
  price: 12000, inStock: true, featured: true, categoryId: 'c1',
};
```
Co-locate test files next to source: `site-config.test.ts`, `validations/product.test.ts`.

## Mock Policy
| What | Policy |
|------|--------|
| Prisma | Use a real Postgres test database (separate DB/schema from dev), not a mocked client — catches real query errors |
| `fetch` in React Query hook tests | Mock per-test, assert request shape and cache behavior |
| NextAuth session | Mock `auth()` return value per test — authenticated vs `null` |
| File upload | Mock the filesystem write in unit tests; cover the real path once in an integration test |

Never mock the module under test. Prefer a real test DB over deep Prisma mocks — this app is small enough that it's cheap and far more trustworthy.

## Flake Protocol
1. Re-run 3× — if it passes 2+/3, it's flaky
2. Fix the root cause: unresolved promise, missing `await`, shared test DB state not reset between tests
3. Reset the test database between test files (or use a fresh Postgres schema per run)
4. No flaky tests merged
