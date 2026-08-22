"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import { useUploadVideo } from "@/hooks/festivalBanners/useUploadVideo";
import { useDeleteImage } from "@/hooks/products/useUploadImage";
import { CircularProgress } from "@/components/ui/CircularProgress";

// Single-video counterpart to ImageUploadField, used only by
// FestivalBannerForm when the admin picks "Video" as the media type.
export function VideoUploadField({
  videoPath,
  onChange,
}: {
  videoPath: string;
  onChange: (path: string) => void;
}) {
  const uploadVideo = useUploadVideo();
  const deleteVideo = useDeleteImage();
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadProgress(0);
    try {
      const path = await uploadVideo.mutateAsync({ file, onProgress: setUploadProgress });
      if (videoPath) deleteVideo.mutate(videoPath);
      onChange(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      e.target.value = "";
      setUploadProgress(0);
    }
  }

  function removeVideo() {
    if (videoPath) deleteVideo.mutate(videoPath);
    onChange("");
  }

  return (
    <div>
      {videoPath ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-maroon/20">
          <video src={videoPath} controls className="aspect-video w-full bg-charcoal" />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute right-1.5 top-1.5 rounded-full bg-charcoal/70 p-1 text-white"
            aria-label="Remove video"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-maroon/30 text-maroon/60 hover:bg-maroon/5">
          {uploadVideo.isPending ? (
            <CircularProgress value={uploadProgress} size={34} />
          ) : (
            <Upload size={18} />
          )}
          <span className="text-xs">{uploadVideo.isPending ? "Uploading..." : "Upload video"}</span>
          <input
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
