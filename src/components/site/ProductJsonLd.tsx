import { siteConfig } from "@/lib/site-config";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";

// This is a catalog/enquiry site, not a checkout flow — prices are
// indicative and change without notice (see siteConfig.productDisclaimer),
// so no price/lowPrice/highPrice is emitted here. Availability is still
// useful/accurate structured data without implying an online purchase.
export function ProductJsonLd({
  product,
  images,
}: {
  product: Product & { category: Category; variants: ProductVariant[] };
  images: string[];
}) {
  const absoluteImages = images.map((src) =>
    src.startsWith("http") ? src : `${siteConfig.siteUrl}${src}`
  );

  // No `offers`/`Offer` node: schema.org (and Google's Product rich-result
  // eligibility) treats an Offer without `price`/`priceCurrency` as
  // incomplete, and this catalog deliberately never emits a price here
  // (see siteConfig.productDisclaimer — prices vary and aren't confirmed
  // accurate ahead of an enquiry). A bare Offer with only availability
  // would just be flagged "Missing field price" in Search Console; better
  // to omit it and keep the still-valid Product/Brand data.
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: absoluteImages.length ? absoluteImages : undefined,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category.name,
    url: `${siteConfig.siteUrl}/catalog/${product.slug}`,
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD only, sourced from our own DB — escape "<" as defense-in-depth against script-tag breakout
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
