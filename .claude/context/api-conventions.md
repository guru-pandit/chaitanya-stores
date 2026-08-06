# API Conventions

## Transport
Next.js Route Handlers under `src/app/api/`. REST/JSON, no GraphQL. Used only by the **admin dashboard** (React Query) and any client-heavy interactive piece (e.g. contact form submit, image upload). The public catalog reads Prisma directly in Server Components and does not go through these routes.

## Request Shape
```ts
// src/app/api/products/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const products = await prisma.product.findMany({
    where: category ? { category: { slug: category } } : undefined,
    include: { category: true },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
```
Item-level routes (`GET/PATCH/DELETE`) live in `src/app/api/products/[id]/route.ts`.

## Auth Gate
Every mutating route (`POST`/`PATCH`/`DELETE`) under `/api/products` and `/api/categories` (and every other admin-only route) must check the session first via `requireAdminSession()` from `src/lib/api-auth.ts` and return its `401` response if absent. `GET` routes used by the public site (if any) stay open; `GET` routes used only by the admin dashboard should still be gated to avoid leaking unpublished data.

**Do not** write `if (!session) return ...` inline against `auth()`'s return value — that pattern fails OPEN if `auth()` ever resolves to a truthy-but-userless object (e.g. a NextAuth config-error shape) instead of `null` (Phase 4 audit finding #1, fixed across all 15 route files). Always go through the shared helper:
```ts
import { requireAdminSession } from "@/lib/api-auth";

const guard = await requireAdminSession();
if ("response" in guard) return guard.response; // 401, body: { error: "Unauthorized" }
// guard.session is a valid, authenticated Session past this point
```

## CSRF
Every mutating route (`POST`/`PATCH`/`DELETE`, including the public `POST /api/contact`) calls `verifyCsrf(req)` from `src/lib/csrf.ts` right after the auth gate (or, for public routes, as the first check) and returns its result if non-null:
```ts
import { verifyCsrf } from "@/lib/csrf";

const csrfError = verifyCsrf(req);
if (csrfError) return csrfError; // 403, generic body — never echoes the rejected origin
```
`verifyCsrf` allows requests with neither an `Origin` nor a `Referer` header (non-browser clients, including this app's own integration tests) and only rejects a request that presents one of those headers with a host outside the allow-list (`Host` header on the request itself, `NEXT_PUBLIC_SITE_URL`, and its www-variant). This is a server-side backstop on top of the `SameSite=Lax` session cookie, not a replacement for it — deliberately implemented as a per-route helper rather than in `src/proxy.ts`, so it stays scoped to state-changing requests.

## Validation
Every route that accepts a body validates with the domain's Zod schema from `src/lib/validations/`, via `safeParse` — never `parse()` (which throws) in a route handler without a catch. Return `400` with `error.flatten()` on failure so the client can map field-level errors.

## Response Shape
```json
// single resource
{ "id": "...", "name": "...", ... }

// list
[ { "id": "...", ... }, ... ]

// error
{ "error": { "fieldErrors": { "name": ["Name is required"] } } }
```
No enveloping `data`/`meta` wrapper needed at this scale — keep responses flat. If pagination becomes necessary later, add `?page=`/`?limit=` query params and a `{ items, total }` shape rather than guessing ahead of time.

## Idempotency
- `GET` — safe to retry
- `POST` — not idempotent; disable the submit button while `useMutation` is `isPending`
- `PATCH`/`DELETE` — idempotent by design; safe to retry on network error
- Category delete must check for existing products first and return `409` with a clear message rather than cascading — the spec requires a guard/warning, not silent deletion

## Rate Limiting
`src/lib/rate-limit.ts` provides in-memory, fixed-window rate limiters (same "in-memory is fine at this scale" stance as `src/lib/login-throttle.ts`):
- `contactRateLimiter` — IP-keyed (via `getClientIp(req)`), 20 requests / 10 minutes, applied to `POST /api/contact`.
- `uploadRateLimiter` — session-user-keyed, 15 requests / 15 minutes, shared between `POST /api/upload` and `POST /api/upload/video` (one combined budget, since both write to the same disk).

Both return `{ allowed, retryAfterSeconds }` from `.check(key)`; on `allowed: false`, return `rateLimitResponse(retryAfterSeconds)` (a `429` with a `Retry-After` header and a generic body). Set `RATE_LIMIT_DISABLED=true` to bypass both limiters entirely — **test-only**, see `.env.example`'s warning; never set it in production.

## API Domain Routes
| Route | Purpose |
|-------|---------|
| `POST /api/auth/[...nextauth]` | NextAuth Credentials sign-in/sign-out |
| `GET/POST /api/products` | List/create products (admin) — `GET` accepts `?categoryId=`, `?brand=`, `?q=` |
| `GET/PATCH/DELETE /api/products/[id]` | Single product ops (admin) |
| `GET /api/products/brands` | Distinct brand values, for filter dropdowns (admin) |
| `GET/POST /api/categories` | List/create categories (admin) |
| `GET/PATCH/DELETE /api/categories/[id]` | Single category ops (admin) — DELETE guards against in-use categories |
| `POST /api/upload` | Image upload, returns stored path |
| `POST /api/contact` | Public contact form submit, optionally writes an `Enquiry` row |
| `POST /api/log-client-error` | Public — forwards a browser-side error report into the server log stream (see `architecture.md`'s Error Handling & Logging) |
