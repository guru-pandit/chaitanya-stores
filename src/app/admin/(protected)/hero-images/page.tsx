"use client";

import { useState } from "react";
import { useSiteSettings } from "@/hooks/settings/useSiteSettings";
import { useUpdateSiteSettings } from "@/hooks/settings/useSiteSettingsMutations";
import { parseImages } from "@/lib/format";
import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { SiteSettings } from "@/generated/prisma/client";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

export default function HeroImagesPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const [images, setImages] = useState<string[]>([]);

  // Seeds local editable state from the fetched settings — and re-seeds
  // after a save's refetch returns a new `settings` reference — without a
  // useEffect (React's documented pattern for adjusting state from a query
  // result, avoiding the extra render pass an effect would cause).
  const [initializedFor, setInitializedFor] = useState<SiteSettings | undefined>(undefined);
  if (settings && settings !== initializedFor) {
    setInitializedFor(settings);
    setImages(parseImages(settings.heroImages));
  }

  function handleSave() {
    updateSettings.mutate(
      { heroImages: images },
      {
        onSuccess: () => toast.success("Hero images updated"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Failed to save hero images"),
      }
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-maroon-dark">Homepage Hero Images</h1>
      <p className="mt-1 text-sm text-charcoal/60">
        These images rotate in the background of the homepage hero section. If none are set, the
        homepage falls back to your featured products&apos; photos.
      </p>

      <div className="mt-6 rounded-2xl border border-maroon/10 bg-white/70 p-6">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full" />
            ))}
          </div>
        ) : (
          <>
            <ImageUploadField images={images} onChange={setImages} thumbnailSize="h-24 w-40" iconSize={18} />

            <div className="mt-6">
              <Button
                type="button"
                loading={updateSettings.isPending}
                variant="primary"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
