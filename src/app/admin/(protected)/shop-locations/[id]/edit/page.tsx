"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ShopLocationForm } from "@/components/admin/ShopLocationForm";
import { useShopLocation } from "@/hooks/shopLocations/useShopLocation";
import { useUpdateShopLocation } from "@/hooks/shopLocations/useShopLocationMutations";
import { ApiError } from "@/lib/api-client";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export default function EditShopLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: shopLocation, isLoading } = useShopLocation(id);
  const { mutate, isPending, error } = useUpdateShopLocation(id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">Edit Shop Location</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        {isLoading ? (
          <FormSkeleton fields={5} />
        ) : !shopLocation ? (
          <EmptyState
            title="Shop location not found"
            description="It may have been deleted, or the link is incorrect."
            action={
              <LinkButton href="/admin/shop-locations" variant="primary" className="mt-2">
                Back to Shop Locations
              </LinkButton>
            }
          />
        ) : (
          <ShopLocationForm
            shopLocation={shopLocation}
            onSubmit={(values) =>
              mutate(values, {
                onSuccess: () => {
                  toast.success("Shop location updated");
                  router.push("/admin/shop-locations");
                },
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Failed to update location"),
              })
            }
            isSubmitting={isPending}
            submitError={error}
          />
        )}
      </div>
    </div>
  );
}
