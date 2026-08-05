# Project: Chaitanya Stores

Marketing + catalog website for a retail business selling **incense sticks (agarbatti) and pooja materials**, built to expand into more product categories over time.

This is **not an e-commerce checkout platform**. No cart, no payment gateway, no shipping logic. Visitors browse a catalog and use **WhatsApp / Email / Call** to enquire about a product. The owner manages products and categories through a private admin dashboard.

Brand feel: traditional and warm — terracotta/maroon/gold tones, subtle diya/lotus/mandala motifs, clean typography. Trustworthy, rooted, premium — not a generic SaaS look.

## Tech Stack
- **Framework**: Next.js (latest stable, App Router), TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: SQLite via Prisma ORM (schema written to be Postgres/MySQL-portable — no SQLite-only types)
- **Validation**: Zod — all form inputs and API/Server Action request bodies; TS types derived via `z.infer`
- **Client state**: Zustand — lightweight client-only UI state (admin filters/sort, upload progress, mobile nav)
- **Server state**: TanStack React Query — admin dashboard CRUD only (list/create/edit/delete with optimistic updates). Public site uses Server Components / direct Prisma queries, no React Query.
- **Auth**: Credential-based admin auth (NextAuth/Auth.js with Credentials provider) — single/few admin users, no public accounts
- **Images**: Local file storage in dev (`/public/uploads`), DB stores path only; upload logic isolated so swapping to S3/Cloudinary later is a small change
- **Package manager**: npm (`npm install`, `npm run dev`, `npm run build`, `npm test`)
- **Deployment target**: Vercel — note filesystem is ephemeral there, local image storage must move to cloud storage before going live

## User Types
Single `AdminUser` role. No multi-admin roles/permissions at this stage.

## Key Paths
| What | Where |
|------|-------|
| Public marketing pages | `src/app/(site)/` |
| Admin dashboard | `src/app/admin/` (protected) |
| API routes | `src/app/api/` |
| Prisma schema | `prisma/schema.prisma` |
| Seed script | `prisma/seed.ts` |
| Zod schemas (source of truth for types) | `src/lib/validations/<domain>.ts` |
| Prisma client singleton | `src/lib/prisma.ts` |
| Site config (WhatsApp/email/phone) | `src/lib/site-config.ts` |
| React Query hooks (admin only) | `src/hooks/<domain>/use<Name>.ts` |
| Zustand stores | `src/store/<name>Store.ts` |
| Shared UI components | `src/components/` |
| Admin-only components | `src/components/admin/` |
| Auth config | `src/lib/auth.ts` |

## Data Model (see `.claude/context/architecture.md` for full schema)
`Category`, `Product` (images as JSON path array, nullable price, inStock/featured flags) with optional `ProductVariant`s (label/price/inStock), `AdminUser`, optional `Enquiry` log for the on-site contact form, `ShopLocation` (multi-shop contact details, one marked primary), `FestivalBanner` (seasonal image/video greeting, at most one active), `SiteSettings` (singleton row — homepage hero images).

## Enquiry Flow (core conversion mechanic)
Every product + the contact page expose three actions: WhatsApp (`wa.me` deep link, pre-filled message), Email (`mailto:` with subject/body), Call (`tel:`). Business phone/email/WhatsApp number lives in `src/lib/site-config.ts` — never hardcoded in components.

## How We Work
- See `.claude/context/architecture.md` before designing anything new.
- See `.claude/context/coding-standards.md` before writing any code.
- See `.claude/context/react-patterns.md` for Server/Client Component, React Query, Zustand, and form patterns.
- See `.claude/context/api-conventions.md` before adding or changing API routes/Server Actions.
- See `.claude/context/security-baseline.md` before touching auth, data, or input.
- See `.claude/context/testing-strategy.md` before writing or modifying tests.
- See `.claude/context/dependencies.md` before adding any package.
- See `.claude/context/design-system.md` before building or styling any UI.

## Agents & Commands
| Command | Agent (model) | Purpose |
|---------|----------------|---------|
| `/create-plan` | Planner (opus) | Analyse requirement, produce plan — no code |
| `/implement` | Implementer (sonnet) | Write production code from approved plan |
| `/review-implementation` | Test Engineer (sonnet) → Security Reviewer (opus) → Code Reviewer (opus) | Three-phase review |
| `/e2e-qa` | E2E QA (sonnet) | Playwright-driven end-to-end QA of public + admin flows; records, doesn't fix |
| `/issues` | — (main conversation) | Compile review + e2e-qa findings into `issues.md` |
| `/docs` | Documenter (haiku) | Create/update README, JSDoc, architecture.md, CHANGELOG |
| `/ship` | Documenter (haiku) | Handoff summary, rollback plan, PR body draft (no file writes) |

Suggested order for a full feature: `/create-plan` → `/implement` → `/review-implementation` → `/e2e-qa` → `/issues` (if anything's open, fix and re-run the failed phase) → `/docs` → `/ship`.

## Hard Rules
- `src/lib/site-config.ts` only for contact details — never hardcode phone/email/WhatsApp number in components
- Zod schema first, derive types with `z.infer` — never hand-write a duplicate interface
- Prisma client only via the `src/lib/prisma.ts` singleton — never `new PrismaClient()` per request
- React Query only in the admin dashboard — public site uses Server Components/direct Prisma
- No cart, checkout, payment gateway, or customer accounts — explicitly out of scope
- Single admin role — do not build multi-role permission logic
- New route → confirm whether it's public (`(site)`) or protected (`admin`) and gate accordingly
- Never commit secrets, tokens, credentials, or `.env` (only `.env.example`)
- Never skip lint, type checks, or tests
- Never change auth logic or the Prisma schema without an approved plan
