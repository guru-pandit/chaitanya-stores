# React Patterns

## Server vs Client Components
Default to Server Components. Add `'use client'` only when you need: hooks (`useState`, React Query, Zustand), event handlers, or browser APIs.

```tsx
// src/app/(site)/catalog/page.tsx — Server Component, no 'use client'
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q } = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      ...(category && { category: { slug: category } }),
      ...(q && { name: { contains: q } }),
    },
    include: { category: true },
  });
  return <ProductGrid products={products} />;
}
```

**Push `'use client'` to the smallest leaf, not the whole component.** `Header` is a Server Component; only the pieces that truly need client state are client components: `NavLink` (needs `usePathname` for active-link styling), `MobileNavToggle`/`MobileNavPanel` (need the Zustand mobile-nav store), and `MobileNavAutoClose` (a render-nothing component that closes the mobile panel on any route change via `usePathname` + `useEffect` — handles link clicks *and* back/forward, which a scattered `onClick={close}` on every link wouldn't). This keeps the header's static shell (logo, layout, sticky wrapper) server-rendered — it's in the initial HTML with zero client JS required — while only ~4 small islands hydrate. Apply the same split whenever a page-level or section-level component only needs client behavior for one small piece of itself.

## React Query — Admin Dashboard Only
```ts
// src/hooks/products/useProducts.ts
export const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetch(`/api/products?${buildQuery(filters)}`).then(r => r.json()),
  });

// src/hooks/products/useCreateProduct.ts
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) =>
      fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
};
```
Never fetch admin CRUD data in a `useEffect` — always a React Query hook. Never use React Query on `(site)` pages.

## Zustand — Client UI State Only
```ts
// src/store/adminFiltersStore.ts
interface AdminFiltersState {
  categoryFilter: string | null;
  sort: 'newest' | 'name';
  setCategoryFilter: (v: string | null) => void;
  setSort: (v: 'newest' | 'name') => void;
}
export const useAdminFiltersStore = create<AdminFiltersState>((set) => ({
  categoryFilter: null,
  sort: 'newest',
  setCategoryFilter: (v) => set({ categoryFilter: v }),
  setSort: (v) => set({ sort: v }),
}));
```
Zustand never holds server data (products, categories) — that belongs to React Query's cache. Zustand is for filters, sort order, upload-in-progress flags, mobile nav open/close.

## Forms — Zod + react-hook-form
Schema is the single source of truth; the form type is inferred, never hand-duplicated.
```ts
// src/lib/validations/product.ts
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().positive().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  inStock: z.boolean(),
  featured: z.boolean(),
});
export type ProductInput = z.infer<typeof productSchema>;
```
```tsx
'use client';
const form = useForm<ProductInput>({ resolver: zodResolver(productSchema) });
const { mutate, isPending } = useCreateProduct();

const onSubmit = form.handleSubmit((values) => mutate(values));
```
The same `productSchema` is reused server-side in the API route with `safeParse` — never trust client validation alone.

**Zod v4 + `@hookform/resolvers` gotcha**: avoid `z.coerce.*()` and `.default()` on schema fields used with `useForm<InferredType>()`. Both make the schema's *input* type diverge from its *output* type (`z.infer`), and `zodResolver`'s generic is typed against the input shape — this fails to typecheck against `useForm<Output>`. Instead keep fields plain (`z.number()`, no `.default()`) and supply concrete defaults via `useForm`'s `defaultValues` / a `Controller` that converts `""` ↔ `null` manually (see `price` in `ProductForm`).

## Shared Form Field Components
`src/components/ui/form/` (`TextField`, `TextareaField`, `SelectField`, `CheckboxField`) wrap the repeated label+input+error markup — use these instead of writing a new `<div><label/><input/>{error}</div>` block per field. They all forward refs and spread props, so they compose directly with `register("field")`. `src/components/ui/Select.tsx` is the underlying primitive that draws a custom chevron (native `<select>` arrows sit flush against rounded/pill borders and look cramped) — use it directly for plain filter dropdowns that aren't part of a react-hook-form (e.g. `ProductFilters`), and via `SelectField` for form fields.

## DataTable
`src/components/ui/DataTable.tsx` is a generic `<T>` table shell (columns config + loading/empty states) — use it for any admin list with more than ~3 columns (see `AdminProductsPage`). For short 1–2 line-per-row lists (e.g. categories), a plain `<ul>` is still fine — don't force DataTable where a list reads better. `RowActions` (`src/components/admin/RowActions.tsx`) is the shared Edit/Delete icon-button pair; `useDeleteWithConfirm` (`src/hooks/useDeleteWithConfirm.ts`) wraps the confirm-dialog + pending-id + error-message pattern used by every delete action.

## Key Rules
| Pattern | Rule |
|---------|------|
| Data fetching (public) | Server Component `await prisma...` — no client fetch |
| Data fetching (admin) | React Query hook — no raw `fetch` in components, no `useEffect` |
| Client UI state | Zustand — never mirror server data into it |
| Forms | `react-hook-form` + `zodResolver(schema)` — schema shared with the API route |
| `key` prop | Entity `id` — never array index on dynamic lists |
| Loading | React Query `isPending` → skeleton/spinner; Server Component → `loading.tsx` |
| Empty | `if (!items.length) return <EmptyState />` — explicit message + CTA, never blank whitespace |
| Error | React Query `isError` → inline retry; API route → typed JSON error, no stack traces to client |
| Images | Next.js `<Image>` component, never raw `<img>`, for anything served from `/public` or a remote allow-listed domain |
