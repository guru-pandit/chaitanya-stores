import { useMutation } from "@tanstack/react-query";
import { uploadWithProgress } from "@/lib/uploadWithProgress";

// Deletion reuses useDeleteImage (src/hooks/products/useUploadImage.ts) —
// DELETE /api/upload works for any /uploads/ path regardless of file type.
export const useUploadVideo = () =>
  useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      const formData = new FormData();
      formData.append("file", file);
      const data = await uploadWithProgress<{ path: string }>("/api/upload/video", formData, onProgress);
      return data.path;
    },
  });
