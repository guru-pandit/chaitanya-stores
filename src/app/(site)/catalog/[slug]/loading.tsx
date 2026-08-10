import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Skeleton className="h-4 w-40" />

      <div className="mt-6 grid gap-10 sm:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />

        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
