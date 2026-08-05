# Coding Standards

## Naming
| Thing | Convention | Example |
|-------|-----------|---------|
| Component | PascalCase | `ProductCard` |
| Server/Client Component file | PascalCase, `.tsx` | `ProductGrid.tsx` |
| React Query hook | `use` + camelCase | `useProducts`, `useCreateProduct` |
| Zustand store | camelCase + `Store` | `adminFiltersStore` |
| Zod schema | camelCase + `Schema` | `productSchema`, `categorySchema` |
| Inferred type | PascalCase, from schema | `type Product = z.infer<typeof productSchema>` |
| API route file | `route.ts` under domain folder | `app/api/products/route.ts` |
| Utility fn | camelCase | `buildWhatsappLink` |
| Constant value | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE_MB` |

## File Structure
```
src/app/(site)/       public route-level pages (Server Components)
src/app/admin/         admin route-level pages (Client Components)
src/app/api/           API routes, one folder per domain
src/components/        shared UI — components/admin/ for dashboard-only
src/hooks/              React Query hooks, grouped by domain — hooks/<domain>/use<Name>.ts
src/store/              Zustand stores
src/lib/                prisma client, auth config, site-config, upload, pure helpers
src/lib/validations/    Zod schemas — <domain>.ts, one file per domain
prisma/                 schema.prisma, seed.ts, migrations/
```

## Types
- Derive types from Zod schemas with `z.infer<typeof schema>` wherever a schema exists — never hand-write a parallel `interface`
- Use Prisma's generated types (`import type { Product } from '@prisma/client'`) for DB-shape data that has no corresponding form; use the Zod-inferred type for anything coming from user input
- `strict: true` in `tsconfig.json` — no implicit `any`, no `// @ts-ignore` without a comment explaining why

## Error Handling
- Validate all API route bodies with `schema.safeParse()` — return `400` with `error.flatten()` on failure, never throw raw
- Client mutations (React Query `useMutation`) surface errors via the `onError` callback, not `try/catch` scattered in components
- Always have loading/error/empty states — never leave a list silently blank
- Never expose raw Prisma error messages to the client — catch and return a generic message, log the real one server-side

```ts
// API route
const parsed = productSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
}
```

## Logging
- No `console.log` in committed code (server-side `console.error` for genuine failures is fine)
- Never log tokens, passwords, session data, or admin credentials

## Async Patterns
- `async/await` over `.then()/.catch()` chains
- Server Components: `await prisma.<model>.findMany()` directly — no `useEffect` fetch on the public site
- Admin mutations: React Query `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)` — never manually refetch with a `useEffect`

## Forbidden Patterns
```ts
// ✗ new PrismaClient() per request/module — use src/lib/prisma.ts singleton
const prisma = new PrismaClient();

// ✗ Hardcoded contact details
<a href="https://wa.me/919876543210">WhatsApp</a>

// ✗ Duplicate type + schema
interface Product { name: string; price: number }
const productSchema = z.object({ name: z.string(), price: z.number() });

// ✗ React Query on the public site
'use client';
const { data } = useQuery(['products'], fetchProducts); // in app/(site)/products/page.tsx

// ✗ Direct Prisma call from a Client Component
'use client';
prisma.product.findMany(); // Prisma cannot run in the browser
```

## React / Next.js Idioms
- Server Components by default; add `'use client'` only where interactivity/hooks are required
- Data mutations from Client Components go through an API route or Server Action — never expose Prisma to the client bundle
- Forms: `react-hook-form` (or plain controlled state for simple forms) + Zod schema via `zodResolver`
- Lists: stable `key` — entity `id`, never array index
- `useMemo`/`useCallback` only for measurably expensive work — don't reflexively wrap everything
- Client state (Zustand) for UI-only concerns; server data always goes through React Query (admin) or Server Component props (public) — never duplicate server data into Zustand
