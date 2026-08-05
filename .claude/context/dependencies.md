# Dependencies

## Approved Libraries by Concern

| Concern | Library | Notes |
|---------|---------|-------|
| Framework | `next` | Latest stable, App Router |
| UI | `react`, `react-dom` | Version pinned by Next.js |
| Language | `typescript` | Strict mode |
| Styling | `tailwindcss` | No CSS-in-JS, no separate component library unless approved |
| ORM | `prisma`, `@prisma/client` | SQLite dev, Postgres/MySQL-ready schema |
| DB driver adapter | `@prisma/adapter-better-sqlite3`, `better-sqlite3` | Prisma 7 requires an explicit adapter — see `architecture.md` |
| Validation | `zod` | Single source of truth for form + API types |
| Forms | `react-hook-form`, `@hookform/resolvers` | Paired with Zod via `zodResolver` |
| Client state | `zustand` | UI-only state, admin dashboard |
| Server state | `@tanstack/react-query` | Admin dashboard CRUD only |
| Auth | `next-auth` (Auth.js) | Credentials provider |
| Password hashing | `bcryptjs` (or `argon2` if native build tooling is acceptable in deploy target) | Never store plaintext |
| Icons | `lucide-react` | Lightweight, tree-shakeable |
| Image optimization | Next.js built-in `<Image>` | No separate image library needed |
| Testing | `vitest`, `@testing-library/react`, `@testing-library/jest-dom` | Or `jest` — pick one at scaffold time and stay consistent |

## Deprecated / Do Not Use
| Library | Reason | Use Instead |
|---------|--------|-------------|
| `axios` | Not needed — `fetch` is built into Next.js/browser | Native `fetch` |
| Redux / Redux Toolkit | Overkill for this app's state needs | Zustand (client) + React Query (server) |
| `moment` | Large bundle, legacy API | Native `Date`/`Intl`, or `date-fns` if formatting gets non-trivial |
| Bootstrap / any CSS framework other than Tailwind | Not in stack, conflicts with design system | Tailwind CSS |
| `getServerSideProps`/Pages Router patterns | This project uses App Router only | Server Components, Route Handlers |
| Raw `<img>` for local/optimizable images | Skips Next.js image optimization | `next/image` |
| `window.alert` / `window.confirm` | Blocks thread, unstyled, poor mobile UX | Inline UI state / a small toast or modal component |

## Pinned Resolutions
None yet. Add here if `npm audit` flags a transitive CVE that requires a forced resolution — document the CVE and why the pin is needed.

## License Policy
- **Allowed**: MIT, ISC, BSD-2, BSD-3, Apache-2.0
- **Review required**: LGPL
- **Forbidden**: GPL, AGPL, SSPL, proprietary/commercial without approval

## Proposing a New Dependency
1. Confirm no approved library already covers the need
2. Check license and bundle size
3. Run `npm audit` after install — no new critical/high CVEs
4. Add to this file under the correct concern
5. Get explicit approval in the plan before merging — **do not install mid-task without approval**
