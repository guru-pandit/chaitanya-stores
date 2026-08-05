import Image from "next/image";
import Link from "next/link";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";
import { formatPrice, formatVariantPrice, parseImages } from "@/lib/format";

export function ProductCard({
  product,
}: {
  product: Product & { category: Category; variants: ProductVariant[] };
}) {
  const images = parseImages(product.images);
  const image = images[0];
  const hasVariants = product.variants.length > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-maroon/10 bg-white/60 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-cream-dark">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-charcoal/40">
            No image yet
          </div>
        )}
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-maroon-dark">
            Featured
          </span>
        )}
        {!product.inStock && (
          <span className="absolute right-3 top-3 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-cream">
            Out of Stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-terracotta">
          {product.category.name} · {product.brand}
        </p>
        <h3 className="font-display text-lg text-maroon-dark">{product.name}</h3>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <p className="text-sm font-medium text-charcoal">
            {hasVariants ? formatVariantPrice(product.variants) : formatPrice(product.price)}
          </p>
          {hasVariants ? (
            <p className="text-xs text-charcoal/50">{product.variants.length} options</p>
          ) : (
            product.weight && <p className="text-xs text-charcoal/50">{product.weight}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
