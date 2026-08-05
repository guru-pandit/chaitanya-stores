import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/categories/useCategoryMutations";
import { ApiError } from "@/lib/api-client";

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("useCreateCategory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("POSTs the category data and invalidates the categories cache on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(201, { id: "c1", name: "Incense" }));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateCategory(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ name: "Incense", slug: "incense", description: "", image: "" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({ method: "POST" })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["categories"] });
  });
});

describe("useUpdateCategory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("PATCHes the given id and invalidates the categories cache on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "c1", name: "Incense" }));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateCategory("c1"), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ name: "Incense", slug: "incense", description: "", image: "" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/categories/c1", expect.objectContaining({ method: "PATCH" }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["categories"] });
  });
});

describe("useDeleteCategory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  function seedListCache(queryClient: QueryClient) {
    queryClient.setQueryData(["categories", 1, 100], {
      items: [
        { id: "c1", name: "Incense" },
        { id: "c2", name: "Dhoop" },
      ],
      total: 2,
    });
  }

  it("optimistically removes the deleted item from a cached list page and decrements total", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(jsonResponse(200, { success: true })), 10)
        )
    );
    const queryClient = new QueryClient();
    seedListCache(queryClient);

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("c1");

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ items: { id: string }[]; total: number }>([
        "categories",
        1,
        100,
      ]);
      expect(cached?.items.map((c) => c.id)).toEqual(["c2"]);
      expect(cached?.total).toBe(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic removal if the delete request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(409, { error: "Category has products" }));
    const queryClient = new QueryClient();
    seedListCache(queryClient);

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<{ items: { id: string }[]; total: number }>([
      "categories",
      1,
      100,
    ]);
    expect(cached?.items.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(cached?.total).toBe(2);
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it("does not touch a cached single-category entry (['categories', id]) that isn't a list page", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { success: true }));
    const queryClient = new QueryClient();
    seedListCache(queryClient);
    queryClient.setQueryData(["categories", "c1"], { id: "c1", name: "Incense" });

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The single-entity cache entry is untouched by the list-shaped optimistic update.
    expect(queryClient.getQueryData(["categories", "c1"])).toEqual({ id: "c1", name: "Incense" });
  });
});
