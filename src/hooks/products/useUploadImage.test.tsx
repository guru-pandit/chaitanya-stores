import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDeleteImage } from "@/hooks/products/useUploadImage";
import { ApiError } from "@/lib/api-client";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

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
