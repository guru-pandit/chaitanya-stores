"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useEnquiries } from "@/hooks/enquiries/useEnquiries";
import { useUpdateEnquiryStatus } from "@/hooks/enquiries/useEnquiryMutations";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default function AdminEnquiriesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, dataUpdatedAt } = useEnquiries({ page, limit: PAGE_SIZE });
  const updateStatus = useUpdateEnquiryStatus();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Completing the only remaining pending row on the last page (or a
  // deletion elsewhere) can leave `page` past the new total — step back
  // rather than showing an empty page that isn't really the end of the
  // list. Adjusted directly during render (React's documented pattern for
  // deriving state from data changes) rather than in a useEffect, keyed off
  // the query's own dataUpdatedAt so it only fires once per fetch.
  const [lastHandledFetch, setLastHandledFetch] = useState<number | null>(null);
  if (data && dataUpdatedAt !== lastHandledFetch) {
    setLastHandledFetch(dataUpdatedAt);
    if (data.items.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }

  function toggleStatus(id: string, name: string, isCompleted: boolean) {
    updateStatus.mutate(
      { id, isCompleted },
      {
        onSuccess: () =>
          toast.success(isCompleted ? `Marked "${name}" as completed` : `Reopened "${name}"`),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Failed to update enquiry"),
      }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon-dark">Enquiries</h1>
      </div>
      <p className="mt-1 text-sm text-charcoal/60">
        Messages submitted through the site&apos;s contact form.
      </p>

      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70">
        {isLoading ? (
          <p className="p-6 text-sm text-charcoal/60">Loading...</p>
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-maroon/10">
              {data.items.map((enquiry) => (
                <li key={enquiry.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-maroon-dark">{enquiry.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          enquiry.isCompleted
                            ? "bg-green-100 text-green-800"
                            : "bg-gold/30 text-maroon-dark"
                        }`}
                      >
                        {enquiry.isCompleted ? "Completed" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal/50">{enquiry.contactMethod}</p>
                    {enquiry.product && (
                      <Link
                        href={`/catalog/${enquiry.product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-terracotta hover:underline"
                      >
                        Re: {enquiry.product.name}
                      </Link>
                    )}
                    <p className="mt-2 text-sm text-charcoal/80">{enquiry.message}</p>
                    <p className="mt-2 text-xs text-charcoal/40">
                      {new Date(enquiry.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(enquiry.id, enquiry.name, !enquiry.isCompleted)}
                    disabled={updateStatus.isPending}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-maroon/20 px-3 py-1.5 text-xs font-medium text-maroon hover:bg-maroon/5 disabled:opacity-50"
                  >
                    {enquiry.isCompleted ? (
                      <>
                        <Circle size={14} /> Mark Pending
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Mark Completed
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No enquiries yet"
              description="Messages submitted through the contact form will show up here."
            />
          </div>
        )}
      </div>
    </div>
  );
}
