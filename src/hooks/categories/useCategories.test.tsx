import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCategories } from "@/hooks/categories/useCategories";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("useCategories", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0 })));
  });

  it("defaults to page 1 and a generously large limit of 100 for dropdown-style callers", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("100");
  });

  it("uses an explicit page/limit when passed (e.g. the admin Categories list page)", async () => {
    const { result } = renderHook(() => useCategories({ page: 3, limit: 20 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("20");
  });

  it("keys the query by page and limit so a page change refetches instead of reusing stale cache", async () => {
    const queryClient = new QueryClient();
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, rerender } = renderHook(({ page }: { page: number }) => useCategories({ page, limit: 20 }), {
      wrapper: localWrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);

    rerender({ page: 2 });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(2));

    const [url] = vi.mocked(fetch).mock.calls[1];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("page")).toBe("2");
  });
});
