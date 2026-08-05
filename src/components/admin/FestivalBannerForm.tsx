"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { festivalBannerSchema, type FestivalBannerInput } from "@/lib/validations/festivalBanner";
import { toDateInputValue } from "@/lib/format";
import { useDeleteImage } from "@/hooks/products/useUploadImage";
import { useApiFormErrors } from "@/hooks/useApiFormErrors";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";
import { CheckboxField } from "@/components/ui/form/CheckboxField";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { VideoUploadField } from "@/components/admin/VideoUploadField";
import type { FestivalBanner } from "@/generated/prisma/client";

export function FestivalBannerForm({
  festivalBanner,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  festivalBanner?: FestivalBanner;
  onSubmit: (values: FestivalBannerInput) => void;
  isSubmitting: boolean;
  submitError?: unknown;
}) {
  const router = useRouter();
  const deleteImage = useDeleteImage();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    setError,
    formState: { errors },
  } = useForm<FestivalBannerInput>({
    resolver: zodResolver(festivalBannerSchema),
    defaultValues: festivalBanner
      ? {
          label: festivalBanner.label,
          mediaType: festivalBanner.mediaType,
          mediaPath: festivalBanner.mediaPath,
          isActive: festivalBanner.isActive,
          startDate: toDateInputValue(festivalBanner.startDate),
          endDate: toDateInputValue(festivalBanner.endDate),
        }
      : {
          label: "",
          mediaType: "IMAGE",
          mediaPath: "",
          isActive: false,
          startDate: "",
          endDate: "",
        },
  });

  const mediaType = watch("mediaType");
  const mediaPath = watch("mediaPath");
  const formError = useApiFormErrors<FestivalBannerInput>(submitError, setError);

  function handleMediaTypeChange(next: "IMAGE" | "VIDEO") {
    if (next === mediaType) return;
    // Switching type invalidates whatever was already uploaded for the
    // other type — start the new type's field empty rather than carrying
    // over a path that doesn't match (e.g. an image path with mediaType
    // VIDEO would break the visitor-facing <video> element). Clean up the
    // now-orphaned file rather than leaving it on disk forever.
    if (mediaPath) deleteImage.mutate(mediaPath);
    setValue("mediaType", next);
    setValue("mediaPath", "");
  }

  function handleImageChange(next: string[]) {
    const newPath = next[next.length - 1] ?? "";
    // Uploading a replacement while one already exists (ImageUploadField
    // appends rather than replacing) — delete the stale file so it isn't
    // orphaned on disk.
    if (mediaPath && newPath !== mediaPath) deleteImage.mutate(mediaPath);
    setValue("mediaPath", newPath);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField
        id="label"
        label="Label"
        required
        error={errors.label?.message}
        placeholder="e.g. Happy Diwali 2026"
        {...register("label")}
      />

      <div>
        <p className="mb-1 block text-sm font-medium text-charcoal">Media Type</p>
        <div className="flex gap-4 text-sm text-charcoal">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mediaType === "IMAGE"}
              onChange={() => handleMediaTypeChange("IMAGE")}
              className="h-4 w-4 border-maroon/30 text-terracotta focus:ring-terracotta"
            />
            Image
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mediaType === "VIDEO"}
              onChange={() => handleMediaTypeChange("VIDEO")}
              className="h-4 w-4 border-maroon/30 text-terracotta focus:ring-terracotta"
            />
            Video
          </label>
        </div>
      </div>

      <div>
        <p className="mb-1 block text-sm font-medium text-charcoal">
          {mediaType === "VIDEO" ? "Banner Video" : "Banner Image"} <span className="text-red-700">*</span>
        </p>
        {mediaType === "VIDEO" ? (
          <VideoUploadField
            videoPath={mediaPath}
            onChange={(path) => setValue("mediaPath", path)}
          />
        ) : (
          <ImageUploadField
            images={mediaPath ? [mediaPath] : []}
            onChange={handleImageChange}
            thumbnailSize="h-24 w-40"
          />
        )}
        {errors.mediaPath && <p className="mt-1 text-xs text-red-700">{errors.mediaPath.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="startDate"
          label="Start Date (optional)"
          type="date"
          hint="Leave blank to show as soon as it's active"
          error={errors.startDate?.message}
          {...register("startDate")}
        />
        <TextField
          id="endDate"
          label="End Date (optional)"
          type="date"
          hint="Leave blank to show indefinitely"
          error={errors.endDate?.message}
          {...register("endDate")}
        />
      </div>

      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <CheckboxField
            label="Active"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />

      {formError && <p className="text-sm text-red-700">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : festivalBanner ? "Save Changes" : "Add Banner"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/festival-banner")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
