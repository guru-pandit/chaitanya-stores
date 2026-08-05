"use client";

import { useRouter } from "next/navigation";
import { FestivalBannerForm } from "@/components/admin/FestivalBannerForm";
import { useCreateFestivalBanner } from "@/hooks/festivalBanners/useFestivalBannerMutations";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

export default function NewFestivalBannerPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateFestivalBanner();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">New Festival Banner</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        <FestivalBannerForm
          onSubmit={(values) =>
            mutate(values, {
              onSuccess: () => {
                toast.success("Festival banner created");
                router.push("/admin/festival-banner");
              },
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Failed to create banner"),
            })
          }
          isSubmitting={isPending}
          submitError={error}
        />
      </div>
    </div>
  );
}
