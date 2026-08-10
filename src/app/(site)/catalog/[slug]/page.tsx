import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatVariantPrice, parseImages } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { EnquiryActions } from "@/components/site/EnquiryActions";
import { ProductJsonLd } from "@/components/site/ProductJsonLd";
import { BreadcrumbJsonLd } from "@/components/site/BreadcrumbJsonLd";
import { ProductGallery } from "@/components/site/ProductGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { category: true } });
  // `error.tsx` in this segment tree forces streaming, so notFound() can no longer set a true
  // 404 status here (a known Next.js/RSC limitation) — noindex prevents this soft-404 from
  // getting indexed even though the HTTP status stays 200.
  if (!product) return { title: "Product Not Found", robots: { index: false, follow: false } };

  const images = parseImages(product.images);
  const description =
    product.description ??
    `${product.name} by ${product.brand} — ${product.category.name} from ${siteConfig.name}.`;

  return {
    title: `${product.name} — ${product.brand}`,
    description,
    alternates: { canonical: `/catalog/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: images[0] ? [images[0]] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, primaryLocation] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: { category: true, variants: true },
    }),
    getPrimaryShopLocation(),
  ]);

  if (!product) notFound();

  const images = parseImages(product.images);
  const hasVariants = product.variants.length > 0;
  const sortedVariants = [...product.variants].sort((a, b) => a.price - b.price);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <ProductJsonLd product={product} images={images} />
      <BreadcrumbJsonLd
        items={[
          { name: "Catalog", path: "/catalog" },
          { name: product.category.name, path: `/categories/${product.category.slug}` },
          { name: product.name, path: `/catalog/${product.slug}` },
        ]}
      />

      <nav className="mb-6 text-sm text-charcoal/60">
        <Link href="/catalog" className="hover:text-terracotta">Catalog</Link>
        <span className="mx-2">/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-terracotta">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <ProductGallery
            images={images}
            alt={`${product.name} ${product.brand} at Chaitanya Stores Sangmeshwar`}
          />
        </div>

        <div>
          {product.featured && (
            <span className="inline-block rounded-full bg-gold px-3 py-1 text-xs font-semibold text-maroon-dark">
              Featured
            </span>
          )}
          <h1 className="mt-3 font-display text-2xl text-maroon-dark sm:text-3xl">{product.name}</h1>
          <Link
            href={`/catalog?brand=${encodeURIComponent(product.brand)}`}
            className="mt-1 inline-block text-sm font-medium text-terracotta hover:underline"
          >
            {product.brand}
          </Link>
          <p className="mt-2 text-lg font-medium text-charcoal">
            {hasVariants ? formatVariantPrice(product.variants) : formatPrice(product.price)}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              product.inStock ? "text-green-700" : "text-charcoal/50"
            }`}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </p>
          {product.description && (
            <p className="mt-6 text-charcoal/80 leading-relaxed">{product.description}</p>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-charcoal/50">Brand</dt>
            <dd className="text-charcoal">{product.brand}</dd>
            {product.productType && (
              <>
                <dt className="text-charcoal/50">Type</dt>
                <dd className="text-charcoal">{product.productType}</dd>
              </>
            )}
            {!hasVariants && product.weight && (
              <>
                <dt className="text-charcoal/50">Weight / Quantity</dt>
                <dd className="text-charcoal">{product.weight}</dd>
              </>
            )}
            {product.sku && (
              <>
                <dt className="text-charcoal/50">SKU</dt>
                <dd className="text-charcoal">{product.sku}</dd>
              </>
            )}
          </dl>

          {hasVariants && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-maroon">
                Available Options
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-maroon/10 text-left text-charcoal/50">
                    <th className="py-2 font-medium">Weight / Quantity</th>
                    <th className="py-2 font-medium">Price</th>
                    <th className="py-2 font-medium">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVariants.map((variant) => (
                    <tr key={variant.id} className="border-b border-maroon/5 last:border-0">
                      <td className="py-2 text-charcoal">{variant.label}</td>
                      <td className="py-2 text-charcoal">{formatPrice(variant.price)}</td>
                      <td
                        className={`py-2 font-medium ${
                          variant.inStock ? "text-green-700" : "text-charcoal/50"
                        }`}
                      >
                        {variant.inStock ? "In Stock" : "Out of Stock"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-maroon">
              Enquire about this product
            </h2>
            <EnquiryActions
              productName={product.name}
              whatsappNumber={primaryLocation.whatsappNumber}
              email={primaryLocation.email}
              phone={primaryLocation.phone}
            />
            <p className="mt-3 text-xs text-charcoal/50">{siteConfig.productDisclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
