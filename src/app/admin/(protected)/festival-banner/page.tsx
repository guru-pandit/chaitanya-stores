"use client";

import { useState } from "react";
import { Plus, Video } from "lucide-react";
import { useFestivalBanners } from "@/hooks/festivalBanners/useFestivalBanners";
import {
  useDeleteFestivalBanner,
  useSetActiveFestivalBanner,
} from "@/hooks/festivalBanners/useFestivalBannerMutations";
import { useDeleteWithConfirm } from "@/hooks/useDeleteWithConfirm";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { BUSINESS_TIME_ZONE } from "@/lib/site-config";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { RowActions } from "@/components/admin/RowActions";
import { UploadedImage } from "@/components/ui/UploadedImage";

const PAGE_SIZE = 20;

// Explicit timeZone so the admin always sees the date they entered,
// regardless of their browser's local timezone — `toLocaleDateString()`
// with no timeZone is browser-local and can show a day off for anyone
// behind UTC (the stored value is a UTC instant anchored to the business's
// own calendar day, see src/lib/validations/festivalBanner.ts).
function formatDate(date: Date | null): string | null {
  return date
    ? new Date(date).toLocaleDateString("en-IN", { timeZone: BUSINESS_TIME_ZONE })
    : null;
}

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

export default function AdminFestivalBannerPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFestivalBanners({ page, limit: PAGE_SIZE });
  const banners = data?.items;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const { mutate: deleteBanner, isPending } = useDeleteFestivalBanner();
  const { confirmDelete, pendingId } = useDeleteWithConfirm(deleteBanner);
  const setActive = useSetActiveFestivalBanner();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon-dark">Festival Banner</h1>
        <LinkButton href="/admin/festival-banner/new" variant="primary">
          <Plus size={16} /> New Banner
        </LinkButton>
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70">
        {isLoading ? (
          <p className="p-6 text-sm text-charcoal/60">Loading...</p>
        ) : banners && banners.length > 0 ? (
          <>
          <ul className="divide-y divide-maroon/10">
            {banners.map((banner) => {
              const start = formatDate(banner.startDate);
              const end = formatDate(banner.endDate);
              return (
                <li key={banner.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-maroon/20 bg-cream-dark">
                      {banner.mediaType === "VIDEO" ? (
                        <Video size={20} className="text-maroon/50" aria-label="Video banner" />
                      ) : (
                        <UploadedImage src={banner.mediaPath} alt={banner.label} fill className="object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-maroon-dark">{banner.label}</p>
                        {banner.isActive && (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-maroon-dark">
                            Active
                          </span>
                        )}
                      </div>
                      {(start || end) && (
                        <p className="text-xs text-charcoal/50">
                          {start ?? "No start"} – {end ?? "No end"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!banner.isActive && (
                      <button
                        type="button"
                        onClick={() =>
                          setActive.mutate(banner, {
                            onSuccess: () => toast.success(`"${banner.label}" is now active`),
                            onError: (err) =>
                              toast.error(
                                err instanceof ApiError ? err.message : "Failed to set active"
                              ),
                          })
                        }
                        disabled={setActive.isPending}
                        className="rounded-full border border-maroon/20 px-3 py-1.5 text-xs font-medium text-maroon hover:bg-maroon/5 disabled:opacity-50"
                      >
                        Set Active
                      </button>
                    )}
                    <RowActions
                      editHref={`/admin/festival-banner/${banner.id}/edit`}
                      label={banner.label}
                      onDelete={() => confirmDelete(banner.id, banner.label)}
                      deleting={isPending && pendingId === banner.id}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No festival banners yet"
              description="Add a greeting banner for the next festival — visitors will see it once, on their first visit while it's active."
              action={
                <LinkButton href="/admin/festival-banner/new" variant="primary" className="mt-2">
                  <Plus size={16} /> New Banner
                </LinkButton>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
