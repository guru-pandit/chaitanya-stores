import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCardSkeleton } from "@/components/site/ProductCardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
