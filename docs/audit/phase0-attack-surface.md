# Phase 0 — Attack Surface & Functionality Map

**Date:** 2026-08-05
**Scope:** Chaitanya Stores — Next.js App Router + TypeScript + Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL + NextAuth Credentials + Zod + Zustand + React Query.
**Purpose:** Foundation document for Phase 1 (functional testing) and Phase 2 (security testing). Test only against local Docker Postgres — never production.

---

## 1. Routes / Pages

### Public site — `src/app/(site)/**` (no auth)

| Route | File | Type | Notes |
|---|---|---|---|
| `/` | `page.tsx` | Server Component, direct Prisma | `force-dynamic` |
| `/products` | `products/page.tsx` | Server Component, direct Prisma | Unauth'd search via raw `searchParams`: `category`, `brand`, `q` (`contains`), `page` — no Zod, no length cap |
| `/products/[slug]` | `products/[slug]/page.tsx` | Server Component, direct Prisma | Soft-404 (`noindex`) rather than real 404 |
| `/categories/[slug]` | `categories/[slug]/page.tsx` | Server Component, direct Prisma | Same soft-404 pattern |
| `/about` | `about/page.tsx` | Server Component, direct Prisma | `force-dynamic` |
| `/contact` | `contact/page.tsx` | Server + client `ContactForm` | POSTs to `/api/contact` |
| `/robots.txt`, `/sitemap.xml`, `/manifest`, `/llms.txt`, `/llms-full.txt` | route handlers | Public, dynamic, Prisma-backed | No rate limiting |

### Admin — `src/app/admin/**`

| Route | Type | Auth |
|---|---|---|
| `/admin` | redirect → `/admin/dashboard` | proxy |
| `/admin/login` | Client Component, `signIn("credentials")` | public (proxy special-cases it) |
| `/admin/dashboard` | **Server Component, direct Prisma** | proxy only — page does **not** call `auth()` itself |
| `/admin/categories`, `/products`, `/enquiries`, `/festival-banner`, `/hero-images`, `/shop-locations` (+ `/new`, `/[id]/edit`) | Client Components → REST API | proxy + per-route API `auth()` |
| `(protected)/layout.tsx` | wraps `SessionProvider`/`QueryProvider`/`AdminShell` | relies entirely on `src/proxy.ts` matcher, no own session check |

---

## 2. API Routes — `src/app/api/**`

| Route | Methods | Auth | Body (Zod) | Query params | Notes |
|---|---|---|---|---|---|
| `auth/[...nextauth]` | GET, POST | n/a | `loginSchema` | — | Credentials only |
| `products` | GET, POST | required | `productSchema` | `categoryId`, `brand`, `q` (raw), `page`, `limit` | |
| `products/[id]` | GET, PATCH, DELETE | required | `productSchema` | — | |
| `products/brands` | GET | required | — | — | |
| `products/generate-sku` | GET | required | — | `brand`, `categoryId` (presence-only check) | Race-prone SKU suffix generation, low severity |
| `categories` | GET, POST | required | `categorySchema` | `page`, `limit` | |
| `categories/[id]` | GET, PATCH, DELETE | required | `categorySchema` | — | DELETE blocked (409) if products reference it |
| `shop-locations` | GET, POST | required | `shopLocationSchema` | `page`, `limit` | "exactly one primary" via `$transaction`, not DB constraint |
| `shop-locations/[id]` | GET, PATCH, DELETE | required | `shopLocationSchema` | — | Blocks deleting/un-primarying the sole primary |
| `festival-banners` | GET, POST | required | `festivalBannerSchema` | `page`, `limit` | "at most one active" via `$transaction`, not DB constraint |
| `festival-banners/[id]` | GET, PATCH, DELETE | required | `festivalBannerSchema` | — | DELETE best-effort unlinks media file |
| `settings` | GET, PATCH | required | `siteSettingsSchema` | — | Singleton row, auto-created on first read (no DB uniqueness guard) |
| `contact` | POST | **public** | `contactSchema` | — | No rate limit/CAPTCHA (by design, flagged for hardening test) |
| `enquiries` | GET | required | — | `page`, `limit` | `productId` is a loose string, not FK |
| `enquiries/[id]` | PATCH | required | `updateEnquirySchema` | — | |
| `upload` | POST, DELETE | required | multipart `file` / JSON `{path}` | — | See §5 |
| `upload/video` | POST | required | multipart `file` | — | See §5 |
| `health` | GET | **public** | — | — | Liveness only, no Prisma touch |
| `log-client-error` | POST | **public** | `clientErrorSchema` | — | No persistence, no rate limit (by design) |

All authenticated routes use the identical inline `const session = await auth(); if (!session) return 401` pattern — no centralized middleware for `/api/**`, no RBAC (single admin role only).

---

## 3. Auth / Authorization Mechanics

- **`src/proxy.ts`**: `matcher: ["/admin", "/admin/:path*"]` — does **not** cover `/api/**`; every API route self-guards.
- **`src/lib/auth.config.ts`** (edge-safe, no DB/bcrypt): `authorized()` callback checks only `isLoggedIn = !!auth?.user`. `/admin/login` special-cased (logged-in → redirect to dashboard; logged-out → pass through). No role/permission model.
- Session: `strategy: "jwt"`, no custom `cookies`/`maxAge` override → NextAuth v5 beta defaults apply (httpOnly, sameSite=lax, secure when HTTPS, ~30 day maxAge). Worth confirming at runtime.
- **`src/lib/auth.ts`** (Node runtime) `authorize()`: Zod-validate → check `isLoginLocked(email)` **before** DB/bcrypt work → `prisma.adminUser.findUnique` → `bcrypt.compare` → record success/failure.
- **`src/lib/login-throttle.ts`**: in-memory `Map`, per-process, **no size cap** (minor memory-exhaustion vector via many distinct emails). 5 attempts → exponential backoff capped at 15 min.

---

## 4. Zod Validation Coverage

| Schema | Notable gaps |
|---|---|
| `contactSchema` | `contactMethod` has **no max length** — only unbounded field in the app |
| `productSchema.images` | `string[]`, no URL/format check, no array-length cap |
| `siteSettingsSchema.heroImages` | same as above |
| `festivalBannerSchema.mediaPath` | any non-empty string — not constrained to `/uploads/...` |
| `contactSchema.productId` | optional, not validated against existing Product |
| `productSchema.categoryId` | not validated as existing/cuid |
| `shopLocationSchema.phone`/`whatsappNumber` | free-text, no phone-format validation |

**Raw (non-Zod) inputs:** `GET /api/products` query params (`categoryId`, `brand`, `q`), `GET /api/products/generate-sku` query params (presence-only), public `/products` page `searchParams`, `DELETE /api/upload` body `{path}` (validated inside `deleteUploadedImage`, not Zod), uploaded `File` objects (validated in `src/lib/upload.ts`, not Zod).

---

## 5. File Upload Handling

- Auth required on all upload/delete operations.
- Type allow-list check (header) **plus** magic-byte sniffing on the buffer (JPEG/PNG/WEBP/WebM/MP4) — saved extension derived from sniffed type, not client-supplied MIME/filename.
- Size caps: images 5 MB, videos 20 MB — checked against `file.size` before buffering, but whole file still buffered via `arrayBuffer()` (no streaming); no Next.js route-level body-size limit configured as backstop.
- Storage: local disk (`public/uploads/`), filenames are `crypto.randomUUID()` + sniffed extension — **no path traversal/overwrite risk** (original filename discarded).
- Deletion only accepts `/uploads/...` paths, rejects `..` — no arbitrary file deletion.
- **Residual risk to test in Phase 1/2:** an authenticated session can upload allowed-type files that are immediately served at guessable `/uploads/<uuid>.<ext>` URLs without ever being attached to a Product/Banner record (orphaned public files). Not a vulnerability by itself, but worth a cleanup/quota check.

---

## 6. Runtime Environment Variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (Prisma adapter) |
| `NODE_ENV` | Prisma client caching toggle |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | JWT signing secret (read internally by NextAuth) |
| `NEXTAUTH_URL` | Canonical URL for auth callbacks/cookie security inference |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed script admin bootstrap — **defaults to `admin@chaitanyastores.example` / `changeme123` if unset** |
| `NEXT_PUBLIC_BUSINESS_PHONE/WHATSAPP/EMAIL/ADDRESS` | Client-exposed contact fallbacks (`site-config.ts`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for sitemap/robots/JSON-LD/llms.txt |
| `POSTGRES_USER/PASSWORD/DB`, `DOMAIN_NAME` | Infra-only (docker-compose/nginx/certbot scripts, not app code) |

`.env` is gitignored; no secrets found committed in this pass.

---

## 7. External Dependencies / Integrations

- **Database:** PostgreSQL via `pg` + `@prisma/adapter-pg` + Prisma 7 — only outbound network call the app code makes.
- **Image/video storage:** local filesystem (`public/uploads/`), no cloud storage integration yet.
- **WhatsApp/email/phone:** client-side link generation only (`wa.me`, `mailto:`, `tel:`) — no server-side API calls.
- **No payment/checkout**, no third-party analytics/CAPTCHA found in reviewed source.
- **Auth:** Credentials provider only, no external OAuth providers configured.

---

## 8. CLI / Script Entry Points

- `package.json` scripts: `dev`, `build` (`prisma generate && next build`), `start`, `lint`, `test` (`vitest run`). No `db:seed` wired into `package.json`.
- `prisma/seed.ts`: upserts 4 categories + 8 products, upserts one `AdminUser` (bcrypt cost 10) — **defaults to well-known credentials if env vars unset**. Flag: confirm production deploy always sets `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
- `scripts/backup.sh`, `scripts/init-letsencrypt.sh`, `scripts/renew-certs.sh` — infra-only, not app entry points (out of scope for app-level testing).

---

## 9. Data Model (`prisma/schema.prisma`)

| Model | Key points |
|---|---|
| `Category` | `@unique slug` |
| `Product` | `@unique slug`, `@unique sku`; `images` is a **JSON-encoded string column**, not a native array — parsed via `parseImages()` with try/catch fallback to `[]`; not validated as JSON array of valid upload paths at write time beyond `string[]` |
| `ProductVariant` | `onDelete: Cascade` from Product |
| `AdminUser` | `@unique email`, no `role` field (single implicit role) |
| `Enquiry` | `productId` is a **plain string, not a real FK** — resolved manually in `GET /api/enquiries` |
| `SiteSettings` | Singleton via `findFirst()`/`getOrCreateSettings()` — **no DB constraint preventing a second row** |
| `ShopLocation` | `isPrimary` "exactly one" invariant is **application-only** (`$transaction`), no partial unique index in any migration |
| `FestivalBanner` | `isActive` "at most one" invariant is **application-only** (`$transaction`), same gap; zero-active is valid |

Migrations confirm the only unique indexes anywhere are `Category.slug`, `Product.slug`, `Product.sku`, `AdminUser.email` — no partial/conditional unique indexes back the two "at most one" business rules.

---

## 10. Dependency Inventory & Known CVEs (`npm audit`)

**12 vulnerabilities: 2 critical, 5 high, 5 moderate** (as of 2026-08-05).

| Package | Severity | Direct? | Advisory | Relevance to this app |
|---|---|---|---|---|
| `next-auth` (`@auth/core` <=0.41.2) | **Critical** | direct | [GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh) — email normalizer Unicode homoglyph `@` bypass | **Relevant** — app uses email-based Credentials login; needs a targeted test in Phase 2A |
| `next-auth` (`@auth/core`) | High | direct | [GHSA-xmf8-cvqr-rfgj](https://github.com/advisories/GHSA-xmf8-cvqr-rfgj) — `getToken()` throws on malformed Bearer header | Relevant — DoS-shaped, test in Phase 2D |
| `next-auth` (`@auth/core`) | Moderate | direct | [GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279) — OAuth state/nonce/PKCE cookie not bound to provider | **Not applicable** — no OAuth providers configured, Credentials only |
| `next` | High | direct | [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) — SSRF via rewrites with attacker-controlled destination hostname | Needs check: does `next.config.ts` define any rewrites? |
| `next` | High | direct | [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) — DoS in Image Optimization API via SVGs | Needs check: is `next/image` used with any user-controlled/remote source? |
| `next` | Critical | direct | [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) — unauthenticated disclosure of internal Server Function endpoints | Needs check: any Server Actions in the app? |
| `postcss` (transitive via `next`) | High | transitive | XSS in CSS stringify + arbitrary `.map` file disclosure via `sourceMappingURL` | Build-time only, low runtime exposure |
| `sharp` (transitive via `next`, libvips CVEs) | High | transitive | Multiple libvips CVEs | Relevant only if `next/image` optimization is active in production |
| `prisma` (dev tooling) | Moderate | direct | dev-only | Not runtime-exposed |
| `valibot`, `hono`, `@hono/node-server`, `brace-expansion`, `fast-uri` | Moderate/High | transitive | Various | Need dependency-tree check for what pulls these in — not obviously used by app code |

`npm audit fix --force` is available but would bump `next` to `16.3.0`, **outside the currently pinned range** — this needs an explicit upgrade decision, not an automatic fix, since it's a version outside `package.json`'s stated constraint and could be a major/breaking bump. **Do not run `--force` without approval.**

---

## Summary of Notable Findings Carried Into Phase 1/2

1. Per-route inline auth checks (no centralized API middleware) — risk that a new route forgets the check; will re-verify every route in Phase 2A.
2. Two public, unauthenticated, unrate-limited write endpoints: `POST /api/contact`, `POST /api/log-client-error` — abuse test in Phase 2D.
3. `contactSchema.contactMethod` has no upper bound — potential oversized-payload test in Phase 1D/2B.
4. Login throttle map has no size cap (memory growth vector) — Phase 2D.
5. `ShopLocation.isPrimary` / `FestivalBanner.isActive` invariants are transaction-, not DB-, enforced — concurrency/race test in Phase 1D.
6. `mediaPath` / `images` fields accept arbitrary strings, not constrained to `/uploads/...` — test whether admin API can be made to reference off-site or malformed paths.
7. `prisma/seed.ts` falls back to well-known default admin credentials if env vars are unset — verify production deploy pipeline always overrides these.
8. Orphaned-but-public uploaded files reachable immediately after upload, before DB attachment — Phase 2D.
9. **Two critical + several high npm audit findings**, concentrated in `next-auth`/`@auth/core` and `next` itself — needs triage in Phase 2C to classify exploitable-in-this-app vs. not, and a scoped-upgrade decision (not blind `--force`).

---

*Sources: direct repository inspection (`src/app/**`, `src/lib/**`, `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`) and `npm audit --json` run 2026-08-05.*
