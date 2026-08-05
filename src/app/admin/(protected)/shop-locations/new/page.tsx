"use client";

import { useRouter } from "next/navigation";
import { ShopLocationForm } from "@/components/admin/ShopLocationForm";
import { useCreateShopLocation } from "@/hooks/shopLocations/useShopLocationMutations";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export default function NewShopLocationPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateShopLocation();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">New Shop Location</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        <ShopLocationForm
          onSubmit={(values) =>
            mutate(values, {
              onSuccess: () => {
                toast.success("Shop location created");
                router.push("/admin/shop-locations");
              },
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Failed to create location"),
            })
          }
          isSubmitting={isPending}
          submitError={error}
        />
      </div>
    </div>
  );
}
