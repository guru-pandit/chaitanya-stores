# Architecture

## Stack
Next.js (App Router) + TypeScript (strict) + Prisma/PostgreSQL + Tailwind CSS + Zod + Zustand + TanStack React Query + NextAuth (Credentials).

## Route Groups
```
src/app/
  (site)/                 Public marketing site — Server Components, direct Prisma reads
    page.tsx              Home
    products/page.tsx     Catalog (filter by category, search by name)
    products/[slug]/page.tsx   Product detail
    categories/[slug]/page.tsx Category landing page
    about/page.tsx
    contact/page.tsx
  admin/                  Protected dashboard — Client Components + React Query
    login/page.tsx
    (protected)/dashboard/page.tsx
    (protected)/products/page.tsx, /new, /[id]/edit    (variants are a nested field on this form, not their own route)
    (protected)/categories/page.tsx, /new, /[id]/edit
    (protected)/shop-locations/page.tsx, /new, /[id]/edit
    (protected)/festival-banner/page.tsx, /new, /[id]/edit
    (protected)/enquiries/page.tsx                      (list contact form submissions, mark complete/pending)
    (protected)/hero-images/page.tsx                    (edits the SiteSettings singleton, no list/new/edit routes)
  api/
    auth/[...nextauth]/route.ts
    products/route.ts, /[id]/route.ts, /brands/route.ts, /generate-sku/route.ts
    categories/route.ts, /[id]/route.ts
    shop-locations/route.ts, /[id]/route.ts
    festival-banners/route.ts, /[id]/route.ts
    settings/route.ts        (SiteSettings singleton — hero images)
    contact/route.ts          (public contact form → Enquiry)
    enquiries/route.ts, /[id]/route.ts   (admin — list & mark enquiries complete)
    upload/route.ts, /video/route.ts
    health/route.ts           (Docker healthcheck target — see docker-compose.yml)
    log-client-error/route.ts (public — forwards browser errors into server logs, see below)
  global-error.tsx          Root-layout crash boundary (see Error Handling & Logging)
instrumentation.ts           Server-side error hook (see Error Handling & Logging)
```

## Data Flow — 2 Distinct Paths
```
Public site:  Server Component → src/lib/prisma.ts → PostgreSQL   (no client fetch, no React Query)
Admin CRUD:   Client Component → React Query hook → API route → Zod validate → Prisma → PostgreSQL
```
Never mix these: public pages must not use React Query; admin mutations must not read Prisma directly from a Client Component (Prisma only runs server-side).

## Data Model (Prisma)
```prisma
model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  image       String?
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id          String           @id @default(cuid())
  name        String
  slug        String           @unique
  description String?
  brand       String           // required — this catalog carries multiple third-party brands
  weight      String?          // free text: "100g", "12 cones", "2 pieces" — not a strict numeric+unit
  productType String?          // free text: "Black Sticks", "Masala Sticks" — optional classification
  sku         String           @unique
  price       Int?             // paise/cents as integer, nullable = "contact for price" — ignored if variants exist
  images      String           @default("[]") // JSON-encoded array of image paths, e.g. '["/uploads/a.jpg"]'
  inStock     Boolean          @default(true)
  featured    Boolean          @default(false)
  category    Category         @relation(fields: [categoryId], references: [id])
  categoryId  String
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([categoryId])
  @@index([brand])
}

// Optional per-product weight/size options, added inline on the product form
// (no separate admin route). A product with variants shows a price range on
// the public site instead of Product.price, which is then unused.
model ProductVariant {
  id        String   @id @default(cuid())
  label     String
  price     Int
  inStock   Boolean  @default(true)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId])
}

model AdminUser {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String
  createdAt      DateTime @default(now())
}

model Enquiry {
  id            String   @id @default(cuid())
  productId     String?
  name          String
  contactMethod String
  message       String
  isCompleted   Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([isCompleted])
}

// Singleton row (always fetched via findFirst) — sitewide config not tied to
// a specific Product/Category. Currently just the homepage hero carousel.
model SiteSettings {
  id         String   @id @default(cuid())
  heroImages String   @default("[]")
  updatedAt  DateTime @updatedAt
}

// One business, multiple physical shops. Exactly one row has isPrimary =
// true at any time, enforced BOTH at the API layer (src/app/api/
// shop-locations, updateMany-then-write $transaction) AND by a Postgres
// partial unique index (`CREATE UNIQUE INDEX ... WHERE "isPrimary" = true`,
// added by a hand-edited migration since schema.prisma can't express a
// partial index) — the API layer alone couldn't serialize genuinely
// concurrent writes (confirmed: 3-6 rows ended up primary under load before
// this fix). The API routes catch the resulting P2002 and return a clean
// 409. See schema.prisma's own comment for the migration-drift hazard this
// creates.
model ShopLocation {
  id             String   @id @default(cuid())
  name           String
  address        String
  phone          String
  whatsappNumber String
  email          String
  isPrimary      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum FestivalBannerMediaType {
  IMAGE
  VIDEO
}

// Seasonal greeting banners (Diwali, Ganpati, etc.), shown to visitors once
// per session while active. Zero active rows is normal between festivals,
// unlike ShopLocation.isPrimary which always has exactly one. "At most one
// active" is enforced the same way as ShopLocation.isPrimary above — API-
// layer $transaction plus a Postgres partial unique index on isActive.
model FestivalBanner {
  id        String                  @id @default(cuid())
  label     String
  mediaType FestivalBannerMediaType @default(IMAGE)
  mediaPath String
  isActive  Boolean                 @default(false)
  startDate DateTime?
  endDate   DateTime?
  createdAt DateTime                @default(now())
  updatedAt DateTime                @updatedAt
}
```
`price` as integer (smallest currency unit), not `Float` — avoids rounding bugs and is portable across Postgres/MySQL. `images` is a JSON string column, not a relation table — simple enough for this catalog's scale; promote to a `ProductImage` relation table if that stops being true.

`brand` is a plain string on `Product`, not a separate `Brand` model — there's no brand-specific data (logo, description, admin CRUD) yet, only filtering by value, so a model would be premature. Empty-string `weight` and `productType` from blank form fields are normalized to `null` before hitting Prisma (see `toProductData()` in `src/lib/validations/product.ts`); `sku` is required and unique (auto-suggested via `/api/products/generate-sku`, editable before save).

**Prisma 7 driver adapter**: this project's Prisma version (7.x) requires an explicit driver adapter — `new PrismaClient()` with no args throws. `src/lib/prisma.ts` and `prisma/seed.ts` both construct `PrismaPg` (`@prisma/adapter-pg`, backed by `pg`) with `{ connectionString: process.env.DATABASE_URL }` and pass it as `{ adapter }`. Locally this points at a Postgres instance running in Docker; production points at a separate Postgres instance run natively on the deploy target, not in Docker — only the `DATABASE_URL` value differs. The generated client also lives at a non-default path: import from `@/generated/prisma/client`, not `@/generated/prisma` (there is no barrel `index`).

## Layers (top → bottom, no upward imports)
```
Pages (Server or Client)  →  Components  →  Hooks (admin only)  →  API routes  →  Prisma  →  DB
                                          →  Zustand stores (client UI state only)
```
- **Server Component pages** (public site): fetch directly via `src/lib/prisma.ts`, no hook layer needed
- **Client Component pages** (admin): use React Query hooks in `src/hooks/<domain>/`, never call Prisma directly
- **API routes**: parse+validate body with Zod, call Prisma, return typed JSON
- **Zustand**: client-only UI state (filters, sort, upload progress, mobile nav) — never server data

## Auth (Admin Only)
NextAuth Credentials provider, session via JWT. `src/lib/auth.ts` defines the full config (Credentials provider, Prisma-backed `authorize`); `src/lib/auth.config.ts` holds the edge/proxy-safe subset (no DB calls) consumed by `src/proxy.ts`, which gates every route under `/admin/*` except `/admin/login`. This split exists because Next.js's proxy/middleware layer is bundled separately — keeping DB/bcrypt code out of `auth.config.ts` avoids bundling issues. No public user accounts, no role matrix — a valid session is sufficient.

## Where New Code Goes
| What | Where |
|------|-------|
| New public page | `src/app/(site)/<route>/page.tsx` — Server Component, fetch via Prisma |
| New admin page | `src/app/admin/(protected)/<route>/page.tsx` + React Query hook |
| New API route | `src/app/api/<domain>/route.ts` (+ `[id]/route.ts` for item ops) |
| New Zod schema | `src/lib/validations/<domain>.ts` — types derived via `z.infer`, used by both the form and the API route |
| New Prisma model | `prisma/schema.prisma` + migration — flag in the plan, do not add unreviewed |
| New Zustand store | `src/store/<name>Store.ts` — client UI state only |
| New React Query hook | `src/hooks/<domain>/use<Name>.ts` — admin dashboard only |
| Site contact info | `src/lib/site-config.ts` — never hardcode phone/email/WhatsApp elsewhere |

## Image Handling
Uploaded files land in `/public/uploads`, DB stores the relative path (`/uploads/<file>.jpg`) — this is true in both dev and production; there is no cloud storage provider (S3/Cloudinary/Cloudflare) in this project. Upload logic lives behind two functions in `src/lib/upload.ts`: `saveUploadedImage` (write + return the public path) and `deleteUploadedImage` (remove a file given its public path, validating it's under `/uploads/` first) — kept isolated so every call site depends only on those signatures, not on where/how the bytes are actually stored. `ImageUploadField` (`src/components/admin/ImageUploadField.tsx`) is the shared upload/thumbnail/remove UI used by `ProductForm` and the hero images admin page; removing a thumbnail calls `deleteUploadedImage` via the `useDeleteImage` hook so orphaned files don't accumulate on disk. `FestivalBannerForm` uses the analogous `VideoUploadField` (`src/components/admin/VideoUploadField.tsx`, posting to `/api/upload/video`) when the banner's media type is `VIDEO` instead of `IMAGE`. **Deployment note**: the production target is a Hostinger VPS running the app in Docker — local disk storage only persists across container redeploys if `public/uploads` is backed by a volume/bind mount outside the app image; that Docker/volume setup is tracked as a follow-up in the README, not yet built.

## Integration Points
| Concern | How |
|---------|-----|
| WhatsApp enquiry | `https://wa.me/<number>?text=<encoded>` built from `src/lib/site-config.ts` |
| Email enquiry | `mailto:<email>?subject=...&body=...` built from `src/lib/site-config.ts` |
| Call enquiry | `tel:<number>` built from `src/lib/site-config.ts` |
| Contact form | Server Action or `/api/contact` → optionally logs to `Enquiry` table, does not replace WhatsApp/Email/Call links |

## Error Handling & Logging
No external logging service — the deploy target is a self-hosted Docker/VPS setup with no platform
log dashboard, so `docker compose logs web` is the actual tool the operator uses. `src/lib/logger.ts`
writes structured JSON lines to stdout/stderr (error/warn → stderr, info → stdout), captured by
Docker's `json-file` log driver (rotation configured in `docker-compose.yml`).

Two independent paths feed it:
- **Server-side**: `src/instrumentation.ts` exports `onRequestError` (Next's global hook) — catches
  uncaught errors in Route Handlers, Server Components, and Server Actions automatically, with
  request context (path/method/route type). No per-route try/catch needed for this to work.
- **Client-side**: the `error.tsx` boundaries (`(site)/error.tsx`, `admin/(protected)/error.tsx`)
  and the root `global-error.tsx` (catches crashes in `layout.tsx` itself — Next requires this file
  separately, and it must render its own `<html>/<body>`) are Client Components, so their errors
  only ever reach the visitor's own browser console by default. `src/lib/reportClientError.ts`
  (`sendBeacon`, with a `fetch(..., { keepalive: true })` fallback) forwards them to
  `POST /api/log-client-error` (public, unauthenticated — same precedent as `/api/contact`; body
  validated by `src/lib/validations/clientError.ts`) so they land in the same log stream instead of
  being invisible server-side.

## SEO
- `src/app/sitemap.ts` / `robots.ts` — Next.js file-convention routes, generated from Prisma at request time (products/categories) plus static routes; admin is disallowed
- `SiteJsonLd` (`src/components/site/SiteJsonLd.tsx`) — `Store` + `WebSite` (with `SearchAction` pointed at `/products?q=`) structured data, rendered once in `(site)/layout.tsx` — never in the root layout, since admin pages shouldn't carry business schema
- `ProductJsonLd` (`src/components/site/ProductJsonLd.tsx`) — per-product `Product`/`Offer`/`Brand` structured data, rendered on the product detail page only
- Every public page sets `alternates.canonical`; product/category pages also set `description`/`openGraph` via `generateMetadata` reading the actual record
- Server Components by default (see `react-patterns.md`) mean page content — including nav — is in the initial server-rendered HTML with no client JS required; verify with `curl` or view-source, not just a browser (which executes JS regardless and can hide a Server/Client mistake)
- **Accepted trade-off — soft 404s on `/products/[slug]` and `/categories/[slug]`**: an unknown slug renders `not-found.tsx` content correctly but the HTTP status stays 200, not 404. Cause: `(site)/error.tsx` is a shared site-wide error boundary (crash recovery + `reportClientError` reporting for every public page, not just these two), and its presence forces streaming for the whole `(site)` tree — once streaming has started, `notFound()` can no longer flip the already-sent 200 status (a known Next.js/RSC limitation). Removing `error.tsx` would restore true 404s here but drop error-boundary/reporting coverage for the entire public site, which is the worse trade. Mitigated instead with `robots: { index: false, follow: false }` in `generateMetadata` so the soft-404 doesn't get indexed. Decision: keep as-is — do not remove `(site)/error.tsx` to chase this.
