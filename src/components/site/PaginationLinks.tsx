import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Server-rendered — plain <a>/<Link> tags so paging works with zero client
// JS (see architecture.md's SEO note on Server Components needing no
// hydration for core content). Preserves every other query param (category,
// brand, q) and only ever overwrites `page`.
export function PaginationLinks({
  basePath,
  page,
  totalPages,
  searchParams,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="flex items-center gap-1 rounded-full border border-maroon/20 px-4 py-2 text-sm font-medium text-maroon hover:bg-maroon/5"
        >
          <ChevronLeft size={16} /> Previous
        </Link>
      ) : (
        <span className="flex items-center gap-1 rounded-full border border-maroon/10 px-4 py-2 text-sm font-medium text-charcoal/30">
          <ChevronLeft size={16} /> Previous
        </span>
      )}

      <span className="text-sm text-charcoal/60">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="flex items-center gap-1 rounded-full border border-maroon/20 px-4 py-2 text-sm font-medium text-maroon hover:bg-maroon/5"
        >
          Next <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="flex items-center gap-1 rounded-full border border-maroon/10 px-4 py-2 text-sm font-medium text-charcoal/30">
          Next <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
