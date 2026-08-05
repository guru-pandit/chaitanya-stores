"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

// Admin list pages drive pagination from React Query state (page number in
// a hook, not the URL), so this is a client component with a callback
// rather than the public site's Link-based PaginationLinks.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-maroon/10 px-4 py-3" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-full border border-maroon/20 px-3 py-1.5 text-xs font-medium text-maroon hover:bg-maroon/5 disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft size={14} /> Previous
      </button>
      <span className="text-xs text-charcoal/60">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-full border border-maroon/20 px-3 py-1.5 text-xs font-medium text-maroon hover:bg-maroon/5 disabled:opacity-40 disabled:pointer-events-none"
      >
        Next <ChevronRight size={14} />
      </button>
    </nav>
  );
}
