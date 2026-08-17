import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUploadVideo } from "@/hooks/festivalBanners/useUploadVideo";
import { ApiError } from "@/lib/api-client";
import { stubXMLHttpRequest } from "@/test/mockXhr";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useUploadVideo", () => {
  it("POSTs the file as multipart form data to /api/upload/video and resolves with the returned path", async () => {
    const calls = stubXMLHttpRequest({ status: 200, body: { path: "/uploads/clip123.mp4" } });
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("/uploads/clip123.mp4");
    expect(calls[0]).toMatchObject({ method: "POST", url: "/api/upload/video" });
    expect(calls[0].body).toBeInstanceOf(FormData);
  });

  it("reports upload progress as it happens", async () => {
    stubXMLHttpRequest({ status: 200, body: { path: "/uploads/clip123.mp4" }, progress: [10, 50, 100] });
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });
    const onProgress = vi.fn();

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate({ file, onProgress });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([10, 50, 100]);
  });

  it("throws an ApiError with the server message when the upload is rejected (e.g. over size limit)", async () => {
    stubXMLHttpRequest({ status: 400, body: { error: "File exceeds 20MB limit" } });
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).message).toBe("File exceeds 20MB limit");
  });

  it("falls back to a generic message when the error body isn't valid JSON", async () => {
    stubXMLHttpRequest({ status: 500, rawBody: "not json" });
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useUploadVideo(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as ApiError).message).toBe("Upload failed");
  });
});
