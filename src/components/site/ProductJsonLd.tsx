import { siteConfig } from "@/lib/site-config";
import { variantPriceRange } from "@/lib/format";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";

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

  const hasVariants = product.variants.length > 0;
  const variantOffer = hasVariants
    ? (() => {
        const { min, max } = variantPriceRange(product.variants);
        return {
          "@type": "AggregateOffer",
          url: `${siteConfig.siteUrl}/products/${product.slug}`,
          priceCurrency: "INR",
          lowPrice: (min / 100).toFixed(2),
          highPrice: (max / 100).toFixed(2),
          offerCount: product.variants.length,
          availability: product.variants.some((v) => v.inStock)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        };
      })()
    : undefined;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: absoluteImages.length ? absoluteImages : undefined,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category.name,
    ...(hasVariants
      ? { offers: variantOffer }
      : product.price != null && {
          offers: {
            "@type": "Offer",
            url: `${siteConfig.siteUrl}/products/${product.slug}`,
            priceCurrency: "INR",
            price: (product.price / 100).toFixed(2),
            availability: product.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }),
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD only, sourced from our own DB — escape "<" as defense-in-depth against script-tag breakout
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
