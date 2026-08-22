"use client";

import { useRef, useState } from "react";
import { X, Upload, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { useUploadImage, useDeleteImage } from "@/hooks/products/useUploadImage";
import { UploadedImage } from "@/components/ui/UploadedImage";
import { CircularProgress } from "@/components/ui/CircularProgress";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Custom drag payload marking a thumbnail-reorder drag, so a reorder drop can
// be told apart from an OS file drop (which reports the "Files" type instead).
const REORDER_MIME = "application/x-image-index";

// Shared upload/thumbnail-grid/remove UI used by ProductForm and the hero
// images admin page. Removing a thumbnail updates the field immediately and
// deletes the file from disk in the background — deletion failure (e.g. the
// file was already gone) never blocks the UI, since the field's job is
// tracking which paths belong to this product/setting, not disk state.
//
// Order is meaningful in both call sites (product cover image / hero slide
// order), so thumbnails can be reordered by dragging. HTML5 drag-and-drop
// does not fire on touch devices and is not keyboard-operable, so the arrow
// buttons on each thumbnail are the primary control on mobile and for
// keyboard users — not a decorative extra.
export function ImageUploadField({
  images,
  onChange,
  thumbnailSize = "h-20 w-20",
  iconSize = 16,
  maxImages,
  reorderHint = "Drag to reorder, or use the arrows. The first image is shown first.",
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
  /** Explains what the ordering means for this particular field. */
  reorderHint?: string;
}) {
  const uploadImage = useUploadImage();
  const deleteImage = useDeleteImage();
  const [error, setError] = useState<string | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  // dragenter/dragleave fire for every child element crossed, so a plain
  // boolean flickers as the pointer moves over thumbnails. Counting
  // enter/leave pairs keeps the highlight stable.
  const dragDepthRef = useRef(0);

  const atLimit = maxImages !== undefined && images.length >= maxImages;
  const canReorder = images.length > 1;

  async function uploadFiles(fileList: FileList | File[]) {
    const candidates = Array.from(fileList);
    if (candidates.length === 0) return;

    setError(null);
    const accepted = candidates.filter((file) => ACCEPTED_TYPES.includes(file.type));
    if (accepted.length === 0) {
      setError("Only JPG, PNG and WebP images can be uploaded.");
      return;
    }

    const remainingSlots = maxImages === undefined ? accepted.length : maxImages - images.length;
    const toUpload = accepted.slice(0, Math.max(0, remainingSlots));
    if (toUpload.length === 0) {
      setError(`Maximum of ${maxImages} images reached.`);
      return;
    }

    // Accumulate and call onChange once at the end: `images` is captured from
    // this render, so calling it per file would repeatedly append to the same
    // stale array and drop every upload but the last.
    const uploaded: string[] = [];
    let failure: string | null = null;
    setUploadingCount(toUpload.length);

    try {
      for (const file of toUpload) {
        setUploadProgress(0);
        try {
          uploaded.push(await uploadImage.mutateAsync({ file, onProgress: setUploadProgress }));
        } catch (err) {
          failure = err instanceof Error ? err.message : "Upload failed";
          break;
        }
      }
    } finally {
      setUploadingCount(0);
      setUploadProgress(0);
    }

    if (uploaded.length > 0) onChange([...images, ...uploaded]);

    const skipped =
      candidates.length - accepted.length + (accepted.length - toUpload.length);
    if (failure) setError(failure);
    else if (skipped > 0) {
      setError(
        maxImages !== undefined && accepted.length > toUpload.length
          ? `Added ${uploaded.length}; the rest exceeded the ${maxImages}-image limit.`
          : `${skipped} file${skipped === 1 ? " was" : "s were"} skipped — only JPG, PNG and WebP are supported.`
      );
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      await uploadFiles(files);
    } finally {
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    const path = images[index];
    onChange(images.filter((_, i) => i !== index));
    deleteImage.mutate(path);
  }

  function moveImage(from: number, to: number) {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  // ---- field-level file drop ----

  function isFileDrag(e: React.DragEvent) {
    return Array.from(e.dataTransfer.types).includes("Files");
  }

  function handleFieldDragEnter(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepthRef.current += 1;
    setIsFileDragOver(true);
  }

  function handleFieldDragOver(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    // Without preventDefault the browser navigates to the dropped file.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleFieldDragLeave(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsFileDragOver(false);
    }
  }

  async function handleFieldDrop(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsFileDragOver(false);
    if (atLimit) {
      setError(`Maximum of ${maxImages} images reached.`);
      return;
    }
    await uploadFiles(e.dataTransfer.files);
  }

  // ---- thumbnail reorder drag ----

  function handleThumbDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData(REORDER_MIME, String(index));
    e.dataTransfer.effectAllowed = "move";
    setDraggingIndex(index);
  }

  function handleThumbDragOver(e: React.DragEvent, index: number) {
    if (draggingIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  }

  function handleThumbDrop(e: React.DragEvent, index: number) {
    if (draggingIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(REORDER_MIME);
    const from = raw === "" ? draggingIndex : Number(raw);
    moveImage(from, index);
    setDraggingIndex(null);
    setDropTargetIndex(null);
  }

  function handleThumbDragEnd() {
    setDraggingIndex(null);
    setDropTargetIndex(null);
  }

  const isUploading = uploadImage.isPending || uploadingCount > 0;
  const uploadLabel =
    uploadingCount > 1 ? `Uploading ${uploadingCount}...` : isUploading ? "Uploading..." : "Upload";

  return (
    <div>
      <div
        data-image-dropzone=""
        onDragEnter={handleFieldDragEnter}
        onDragOver={handleFieldDragOver}
        onDragLeave={handleFieldDragLeave}
        onDrop={handleFieldDrop}
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          isFileDragOver ? "border-terracotta bg-terracotta/5" : "border-transparent"
        }`}
      >
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div
              key={src}
              draggable={canReorder}
              onDragStart={(e) => handleThumbDragStart(e, i)}
              onDragOver={(e) => handleThumbDragOver(e, i)}
              onDrop={(e) => handleThumbDrop(e, i)}
              onDragEnd={handleThumbDragEnd}
              aria-label={`Image ${i + 1} of ${images.length}`}
              className={`relative overflow-hidden rounded-lg border border-maroon/20 ${thumbnailSize} ${
                canReorder ? "cursor-grab active:cursor-grabbing" : ""
              } ${draggingIndex === i ? "opacity-40" : ""} ${
                dropTargetIndex === i && draggingIndex !== i
                  ? "ring-2 ring-terracotta ring-offset-1"
                  : ""
              }`}
            >
              <UploadedImage src={src} alt="" fill sizes="160px" className="object-cover" />

              <span className="absolute left-0.5 top-0.5 rounded bg-charcoal/70 px-1 text-[10px] font-semibold leading-4 text-white">
                {i + 1}
              </span>

              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-charcoal/70 p-0.5 text-white"
                aria-label={`Remove image ${i + 1}`}
              >
                <X size={12} />
              </button>

              {canReorder && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-charcoal/60 px-0.5">
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    disabled={i === 0}
                    className="rounded p-0.5 text-white disabled:opacity-30"
                    aria-label={`Move image ${i + 1} earlier`}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <GripVertical size={10} className="text-white/60" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    disabled={i === images.length - 1}
                    className="rounded p-0.5 text-white disabled:opacity-30"
                    aria-label={`Move image ${i + 1} later`}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {!atLimit && (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-maroon/30 text-center text-maroon/60 hover:bg-maroon/5 ${thumbnailSize}`}
            >
              {isUploading ? (
                <CircularProgress value={uploadProgress} size={iconSize + 16} />
              ) : (
                <Upload size={iconSize} />
              )}
              <span className="px-1 text-xs leading-tight">{uploadLabel}</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        {isFileDragOver && (
          <p className="mt-2 text-xs font-medium text-terracotta">Drop images to upload</p>
        )}
      </div>

      {canReorder && <p className="mt-1 text-xs text-charcoal/60">{reorderHint}</p>}
      {atLimit && (
        <p className="mt-2 text-xs text-charcoal/60">Maximum of {maxImages} images reached.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
