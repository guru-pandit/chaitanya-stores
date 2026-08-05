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
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
Every mutating route (`POST`/`PATCH`/`DELETE`) under `/api/products` and `/api/categories` must check the session first via `auth()` from `src/lib/auth.ts` and return `401` if absent. `GET` routes used by the public site (if any) stay open; `GET` routes used only by the admin dashboard should still be gated to avoid leaking unpublished data.

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
Not implemented at this scale (single admin, low traffic). If the public contact form is abused, add a simple in-memory or edge-config rate limit before reaching for external infra.

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
