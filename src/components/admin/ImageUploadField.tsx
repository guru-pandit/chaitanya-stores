"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { useUploadImage, useDeleteImage } from "@/hooks/products/useUploadImage";

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
}: {
  images: string[];
  onChange: (images: string[]) => void;
  thumbnailSize?: string;
  iconSize?: number;
}) {
  const uploadImage = useUploadImage();
  const deleteImage = useDeleteImage();
  const [error, setError] = useState<string | null>(null);

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
            <Image src={src} alt="" fill sizes="160px" className="object-cover" />
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
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
