import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { uploadWithProgress } from "@/lib/uploadWithProgress";

export const useUploadImage = () =>
  useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      const formData = new FormData();
      formData.append("file", file);
      const data = await uploadWithProgress<{ path: string }>("/api/upload", formData, onProgress);
      return data.path;
    },
  });

export const useDeleteImage = () =>
  useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error ?? "Delete failed");
      }
    },
  });
