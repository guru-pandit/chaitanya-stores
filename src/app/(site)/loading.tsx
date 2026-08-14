import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCardSkeleton } from "@/components/site/ProductCardSkeleton";

export default function Loading() {
  return (
    <div>
      {/* Matches the real hero's viewport-filling sizing (see (site)/page.tsx)
          so the skeleton-to-content swap doesn't jump the page height. */}
      <section className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-20">
        <Skeleton className="mx-auto h-4 w-48" />
        <Skeleton className="mx-auto mt-4 h-10 w-full max-w-2xl" />
        <Skeleton className="mx-auto mt-3 h-10 w-5/6 max-w-2xl" />
        <Skeleton className="mx-auto mt-6 h-4 w-80 max-w-full" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
