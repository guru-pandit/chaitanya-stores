import { Skeleton } from "@/components/ui/Skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-maroon/10 bg-white/60">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <Skeleton className="h-3 w-1/2" />
        {/* text-sm sm:text-lg matches ProductCard's <h3> so this reserved
            two-line block (min-h-[2.75em]) is the same height the real name
            will occupy — otherwise the grid jumps when content loads. */}
        <div className="flex min-h-[2.75em] flex-col gap-1.5 text-sm sm:text-lg">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2 sm:hidden" />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
