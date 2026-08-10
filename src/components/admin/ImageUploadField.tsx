"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import { useUploadImage, useDeleteImage } from "@/hooks/products/useUploadImage";
import { UploadedImage } from "@/components/ui/UploadedImage";

// Shared upload/thumbnail-grid/remove UI used by ProductForm and the hero
// images admin page. Removing a thumbnail updates the field immediately and
// deletes the file from disk in the background — deletion failure (e.g. the
// file was already gone) never blocks the UI, since the field's job is
// tracking which paths belong to this product/setting, not disk state.
export function ImageUploadField({
  images,
  onChange,
  thumbnailSize = "h-20 w-20",
  iconSize = 16,
  maxImages,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  thumbnailSize?: string;
  iconSize?: number;
  /** Hides the upload control once `images.length` reaches this — mirrors
   * the server-side cap in src/lib/validations/uploadPath.ts so a client
   * can't upload a file that's just going to be rejected on save (and left
   * orphaned on disk with no cleanup path, since it was never added to
   * `images`). Omit for fields with no array cap (e.g. a single image). */
  maxImages?: number;
}) {
  const uploadImage = useUploadImage();
  const deleteImage = useDeleteImage();
  const [error, setError] = useState<string | null>(null);
  const atLimit = maxImages !== undefined && images.length >= maxImages;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const path = await uploadImage.mutateAsync(file);
      onChange([...images, path]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    const path = images[index];
    onChange(images.filter((_, i) => i !== index));
    deleteImage.mutate(path);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div
            key={src}
            className={`relative overflow-hidden rounded-lg border border-maroon/20 ${thumbnailSize}`}
          >
            <UploadedImage src={src} alt="" fill sizes="160px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute right-0.5 top-0.5 rounded-full bg-charcoal/70 p-0.5 text-white"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {!atLimit && (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-maroon/30 text-maroon/60 hover:bg-maroon/5 ${thumbnailSize}`}
          >
            <Upload size={iconSize} />
            <span className="text-xs">{uploadImage.isPending ? "Uploading..." : "Upload"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
      {atLimit && (
        <p className="mt-2 text-xs text-charcoal/60">Maximum of {maxImages} images reached.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
