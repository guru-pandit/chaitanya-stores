import { ApiError } from "@/lib/api-client";

// `fetch` has no cross-browser way to observe upload (request body) progress
// — only download progress, via the response body stream. XMLHttpRequest's
// `upload.onprogress` is still the only reliable way to report bytes sent,
// which is why this exists instead of just using apiFetch for uploads.
export function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }

      const message =
        body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Upload failed";
      reject(new ApiError(message));
    };

    xhr.onerror = () => reject(new ApiError("Upload failed"));
    xhr.send(formData);
  });
}
