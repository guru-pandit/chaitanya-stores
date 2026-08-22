import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDeleteImage, useUploadImage } from "@/hooks/products/useUploadImage";
import { ApiError } from "@/lib/api-client";
import { stubXMLHttpRequest } from "@/test/mockXhr";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useUploadImage", () => {
  it("POSTs the file as multipart form data and resolves with the returned path", async () => {
    const calls = stubXMLHttpRequest({ status: 200, body: { path: "/uploads/abc123.jpg" } });
    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() => useUploadImage(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("/uploads/abc123.jpg");
    expect(calls[0]).toMatchObject({ method: "POST", url: "/api/upload" });
    expect(calls[0].body).toBeInstanceOf(FormData);
  });

  it("reports upload progress as it happens", async () => {
    stubXMLHttpRequest({ status: 200, body: { path: "/uploads/abc123.jpg" }, progress: [25, 60, 100] });
    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    const onProgress = vi.fn();

    const { result } = renderHook(() => useUploadImage(), { wrapper });
    result.current.mutate({ file, onProgress });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([25, 60, 100]);
  });

  it("throws an ApiError with the server message when the upload is rejected", async () => {
    stubXMLHttpRequest({ status: 400, body: { error: "Unsupported file type" } });
    const file = new File(["fake"], "photo.gif", { type: "image/gif" });

    const { result } = renderHook(() => useUploadImage(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).message).toBe("Unsupported file type");
  });

  it("falls back to a generic message when the error body isn't valid JSON", async () => {
    stubXMLHttpRequest({ status: 500, rawBody: "not json" });
    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() => useUploadImage(), { wrapper });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as ApiError).message).toBe("Upload failed");
  });
});

describe("useDeleteImage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends a DELETE request with the path and resolves on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useDeleteImage(), { wrapper });
    result.current.mutate("/uploads/a.jpg");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/upload",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ path: "/uploads/a.jpg" }),
      })
    );
  });

  it("throws an ApiError with the server message on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid upload path." }), { status: 400 })
    );

    const { result } = renderHook(() => useDeleteImage(), { wrapper });
    result.current.mutate("/etc/passwd");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).message).toBe("Invalid upload path.");
  });
});
