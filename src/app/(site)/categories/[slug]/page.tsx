import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/site/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BreadcrumbJsonLd } from "@/components/site/BreadcrumbJsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  // See products/[slug]/page.tsx: error.tsx forces streaming, so notFound() can't set a true
  // 404 status here — noindex prevents this soft-404 from getting indexed.
  if (!category) return { title: "Category Not Found", robots: { index: false, follow: false } };

  const description =
    category.description ?? `Browse ${category.name} products from Chaitanya Stores.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: category.name, description, type: "website" },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: { include: { category: true, variants: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "Catalog", path: "/catalog" },
          { name: category.name, path: `/categories/${category.slug}` },
        ]}
      />
      <h1 className="font-display text-2xl text-maroon-dark sm:text-3xl">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-charcoal/70">{category.description}</p>
      )}

      {category.products.length ? (
        <>
          {/* sr-only — keeps heading order strict (h1 -> h2 -> ProductCard's
              h3) without adding a visible section label the design doesn't
              call for. */}
          <h2 className="sr-only">{category.name} Products</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No products in this category yet"
            description="Check back soon — we're always adding to our catalog."
          />
        </div>
      )}
    </div>
  );
}
