import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

export const useUploadImage = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error ?? "Upload failed");
      }
      const data: { path: string } = await res.json();
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
