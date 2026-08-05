import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="mt-8 space-y-3 rounded-2xl border border-maroon/10 bg-white/70 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
