import Link from "next/link";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";
import { formatPrice, formatVariantPrice, parseImages } from "@/lib/format";
import { UploadedImage } from "@/components/ui/UploadedImage";

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
      href={`/catalog/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-maroon/10 bg-white/60 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-cream-dark">
        {image ? (
          <UploadedImage
            src={image}
            alt={`${product.name} ${product.brand} at Chaitanya Stores Sangmeshwar`}
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
          <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-maroon-dark sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
            Featured
          </span>
        )}
        {!product.inStock && (
          <span className="absolute right-2 top-2 rounded-full bg-charcoal/80 px-2.5 py-0.5 text-[11px] font-semibold text-cream sm:right-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
            Out of Stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="line-clamp-1 text-[11px] uppercase tracking-normal text-terracotta sm:text-xs sm:tracking-wide">
          {product.category.name} · {product.brand}
        </p>
        <h3 className="line-clamp-2 min-h-[2.75em] font-display text-sm leading-snug text-maroon-dark sm:text-lg">
          {product.name}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 pt-2">
          <p className="text-sm font-medium text-charcoal">
            {hasVariants ? formatVariantPrice(product.variants) : formatPrice(product.price)}
          </p>
          {hasVariants ? (
            <p className="shrink-0 text-xs text-charcoal/50">{product.variants.length} options</p>
          ) : (
            product.weight && <p className="shrink-0 text-xs text-charcoal/50">{product.weight}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
