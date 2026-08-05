import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useProducts } from "@/hooks/products/useProducts";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("useProducts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0 })));
  });

  it("defaults page to 1 and limit to 20 when omitted", async () => {
    const { result } = renderHook(() => useProducts({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("20");
    expect(params.has("categoryId")).toBe(false);
    expect(params.has("brand")).toBe(false);
    expect(params.has("q")).toBe(false);
  });

  it("includes categoryId/brand/q only when truthy, and passes through explicit page/limit", async () => {
    const { result } = renderHook(
      () => useProducts({ categoryId: "cat-1", brand: "Cycle", q: "sandalwood", page: 2, limit: 10 }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("categoryId")).toBe("cat-1");
    expect(params.get("brand")).toBe("Cycle");
    expect(params.get("q")).toBe("sandalwood");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("10");
  });

  it("omits an empty-string filter (falsy) rather than sending an empty query param", async () => {
    const { result } = renderHook(() => useProducts({ brand: "" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.has("brand")).toBe(false);
  });
});
