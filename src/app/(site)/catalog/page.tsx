import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildWhatsappLink, CONTACT_COMING_SOON, hasContactValue, siteConfig } from "@/lib/site-config";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { ProductCard } from "@/components/site/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductFilters } from "@/components/site/ProductFilters";
import { PaginationLinks } from "@/components/site/PaginationLinks";

const PAGE_SIZE = 24;

const CATALOG_TITLE = "Agarbatti, Dhoop & Camphor Catalog | Chaitanya Stores Sangmeshwar";
const CATALOG_DESCRIPTION =
  "Browse agarbatti, dhoop, sambrani, camphor, and pooja thali essentials from trusted brands. Filter by category or brand and enquire via WhatsApp, email, or call.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's `%s | Chaitanya Stores` title
  // template — this exact string already carries its own suffix.
  title: { absolute: CATALOG_TITLE },
  description: CATALOG_DESCRIPTION,
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: CATALOG_TITLE,
    description: CATALOG_DESCRIPTION,
    type: "website",
    url: `${siteConfig.siteUrl}/catalog`,
  },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string; q?: string; page?: string }>;
}) {
  const { category, brand, q, page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam);
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1;

  const where = {
    isHidden: false,
    ...(category ? { category: { slug: category } } : {}),
    ...(brand ? { brand } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const [products, total, categories, brandRows, primaryLocation] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { isHidden: false },
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    getPrimaryShopLocation(),
  ]);

  const brands = brandRows.map((r) => r.brand);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-2xl text-maroon-dark sm:text-3xl">
        Agarbatti, Dhoop &amp; Pooja Samagri Catalog
      </h1>
      <p className="mt-2 max-w-2xl text-charcoal/70">
        Tap a product below to enquire — this is a catalog, not an online checkout, so every enquiry
        goes to us directly via WhatsApp, email, or call.
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
          {/* sr-only — keeps heading order strict (h1 -> h2 -> ProductCard's
              h3) without adding a visible section label the design doesn't
              call for. */}
          <h2 className="sr-only">Catalog Results</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <PaginationLinks
            basePath="/catalog"
            page={page}
            totalPages={totalPages}
            searchParams={{ category, brand, q }}
          />
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No products found"
            description="Try a different search term, category, or brand — or send us a WhatsApp message and we'll help you find what you're looking for."
            action={
              hasContactValue(primaryLocation.whatsappNumber) ? (
                <a
                  href={buildWhatsappLink(primaryLocation.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
                >
                  <MessageCircle size={16} /> Ask on WhatsApp
                </a>
              ) : (
                <p className="text-sm text-charcoal/50">{CONTACT_COMING_SOON}</p>
              )
            }
          />
        </div>
      )}

      <section className="mt-16 max-w-3xl border-t border-maroon/10 pt-10">
        <h2 className="font-display text-xl text-maroon-dark sm:text-2xl">
          Pooja Samagri in Sangmeshwar, Ratnagiri
        </h2>
        <p className="mt-3 text-charcoal/70 leading-relaxed">
          Chaitanya Stores stocks agarbatti (incense sticks), dhoop and dhoop sticks, sambrani/dhoop
          cones, camphor (tablets and cups), and pooja thali essentials like kumkum and chandan from
          trusted brands including Satya, Janak, Manohar, Anil, and Forest. Whether you need items for
          daily pooja, festivals, havan, or satyanarayan pooja, browse the catalog above and reach out
          to check what&apos;s in stock.
        </p>
        <p className="mt-3 text-sm text-charcoal/60">
          Prices and stock vary and are not guaranteed by this listing — please confirm with us via
          WhatsApp, call, or email before visiting.
        </p>
      </section>
    </div>
  );
}
