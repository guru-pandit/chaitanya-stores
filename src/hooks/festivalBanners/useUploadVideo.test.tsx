import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUploadVideo } from "@/hooks/festivalBanners/useUploadVideo";
import { ApiError } from "@/lib/api-client";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useUploadVideo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("POSTs the file as multipart form data to /api/upload/video and resolves with the returned path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ path: "/uploads/clip123.mp4" }), { status: 200 })
    );
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("/uploads/clip123.mp4");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/upload/video");
    expect(init).toMatchObject({ method: "POST" });
    expect(init!.body).toBeInstanceOf(FormData);
  });

  it("throws an ApiError with the server message when the upload is rejected (e.g. over size limit)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "File exceeds 20MB limit" }), { status: 400 })
    );
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).message).toBe("File exceeds 20MB limit");
  });

  it("falls back to a generic message when the error body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json", { status: 500 }));
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as ApiError).message).toBe("Upload failed");
  });
});
