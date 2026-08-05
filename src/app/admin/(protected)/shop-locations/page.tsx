"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useShopLocations } from "@/hooks/shopLocations/useShopLocations";
import {
  useDeleteShopLocation,
  useSetPrimaryShopLocation,
} from "@/hooks/shopLocations/useShopLocationMutations";
import { useDeleteWithConfirm } from "@/hooks/useDeleteWithConfirm";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { RowActions } from "@/components/admin/RowActions";

const PAGE_SIZE = 20;

export default function AdminShopLocationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useShopLocations({ page, limit: PAGE_SIZE });
  const locations = data?.items;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const { mutate: deleteLocation, isPending } = useDeleteShopLocation();
  const { confirmDelete, pendingId } = useDeleteWithConfirm(deleteLocation);
  const setPrimary = useSetPrimaryShopLocation();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon-dark">Shop Locations</h1>
        <LinkButton href="/admin/shop-locations/new" variant="primary">
          <Plus size={16} /> New Location
        </LinkButton>
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70">
        {isLoading ? (
          <p className="p-6 text-sm text-charcoal/60">Loading...</p>
        ) : locations && locations.length > 0 ? (
          <>
            <ul className="divide-y divide-maroon/10">
              {locations.map((location) => (
                <li key={location.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-maroon-dark">{location.name}</p>
                      {location.isPrimary && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-maroon-dark">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal/50">{location.address}</p>
                    <p className="text-xs text-charcoal/50">
                      {location.phone} · {location.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!location.isPrimary && (
                      <button
                        type="button"
                        onClick={() =>
                          setPrimary.mutate(location, {
                            onSuccess: () => toast.success(`"${location.name}" is now primary`),
                            onError: (err) =>
                              toast.error(
                                err instanceof ApiError ? err.message : "Failed to set primary"
                              ),
                          })
                        }
                        disabled={setPrimary.isPending}
                        className="rounded-full border border-maroon/20 px-3 py-1.5 text-xs font-medium text-maroon hover:bg-maroon/5 disabled:opacity-50"
                      >
                        Set Primary
                      </button>
                    )}
                    <RowActions
                      editHref={`/admin/shop-locations/${location.id}/edit`}
                      label={location.name}
                      onDelete={() => confirmDelete(location.id, location.name)}
                      deleting={isPending && pendingId === location.id}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No shop locations yet"
              description="Add your first shop location — it will automatically become the primary one."
              action={
                <LinkButton href="/admin/shop-locations/new" variant="primary" className="mt-2">
                  <Plus size={16} /> New Location
                </LinkButton>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
