import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

// Deletion reuses useDeleteImage (src/hooks/products/useUploadImage.ts) —
// DELETE /api/upload works for any /uploads/ path regardless of file type.
export const useUploadVideo = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/video", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error ?? "Upload failed");
      }
      const data: { path: string } = await res.json();
      return data.path;
    },
  });
