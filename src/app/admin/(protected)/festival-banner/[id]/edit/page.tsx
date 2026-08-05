"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { FestivalBannerForm } from "@/components/admin/FestivalBannerForm";
import { useFestivalBanner } from "@/hooks/festivalBanners/useFestivalBanner";
import { useUpdateFestivalBanner } from "@/hooks/festivalBanners/useFestivalBannerMutations";
import { ApiError } from "@/lib/api-client";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

export default function EditFestivalBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: festivalBanner, isLoading } = useFestivalBanner(id);
  const { mutate, isPending, error } = useUpdateFestivalBanner(id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-maroon-dark">Edit Festival Banner</h1>
      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        {isLoading ? (
          <FormSkeleton fields={4} />
        ) : !festivalBanner ? (
          <EmptyState
            title="Festival banner not found"
            description="It may have been deleted, or the link is incorrect."
            action={
              <LinkButton href="/admin/festival-banner" variant="primary" className="mt-2">
                Back to Festival Banners
              </LinkButton>
            }
          />
        ) : (
          <FestivalBannerForm
            festivalBanner={festivalBanner}
            onSubmit={(values) =>
              mutate(values, {
                onSuccess: () => {
                  toast.success("Festival banner updated");
                  router.push("/admin/festival-banner");
                },
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Failed to update banner"),
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
