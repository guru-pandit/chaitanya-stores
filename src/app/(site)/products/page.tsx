import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/site/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductFilters } from "@/components/site/ProductFilters";
import { PaginationLinks } from "@/components/site/PaginationLinks";

const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse incense sticks, dhoop, camphor, and pooja essentials from trusted brands. Filter by category or brand and enquire via WhatsApp, email, or call.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string; q?: string; page?: string }>;
}) {
  const { category, brand, q, page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam);
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1;

  const where = {
    ...(category ? { category: { slug: category } } : {}),
    ...(brand ? { brand } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const [products, total, categories, brandRows] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
  ]);

  const brands = brandRows.map((r) => r.brand);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-2xl text-maroon-dark sm:text-3xl">Our Products</h1>
      <p className="mt-2 text-charcoal/70">
        Browse the full catalog. Tap a product to enquire via WhatsApp, email, or call.
      </p>

      <ProductFilters
        categories={categories}
        brands={brands}
        activeCategory={category ?? ""}
        activeBrand={brand ?? ""}
        activeQuery={q ?? ""}
      />

      {products.length ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <PaginationLinks
            basePath="/products"
            page={page}
            totalPages={totalPages}
            searchParams={{ category, brand, q }}
          />
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No products found"
            description="Try a different search term, category, or brand."
          />
        </div>
      )}
    </div>
  );
}
