import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductHidden,
} from "@/hooks/products/useProductMutations";
import { ApiError } from "@/lib/api-client";
import type { ProductInput } from "@/lib/validations/product";
import type { ProductWithCategory } from "@/hooks/products/useProducts";

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const productInput: ProductInput = {
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "",
  brand: "Cycle",
  weight: "100g",
  productType: "",
  sku: "CYC-INC-001",
  price: 12000,
  images: [],
  inStock: true,
  featured: false,
  isHidden: false,
  categoryId: "cat-1",
  variants: [],
};

describe("useCreateProduct", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("POSTs the product data and invalidates the products cache on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(201, { id: "p1", ...productInput }));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateProduct(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(productInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/products", expect.objectContaining({ method: "POST" }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });

  it("surfaces an ApiError with fieldErrors on a 400 validation failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, { error: { fieldErrors: { sku: ["SKU already in use"] } } })
    );
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useCreateProduct(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(productInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).fieldErrors).toEqual({ sku: ["SKU already in use"] });
  });
});

describe("useUpdateProduct", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("PATCHes the given id and invalidates the products cache on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "p1", ...productInput }));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateProduct("p1"), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(productInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/products/p1", expect.objectContaining({ method: "PATCH" }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });
});

describe("useToggleProductHidden", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  const product: ProductWithCategory = {
    id: "p1",
    name: "Sandalwood Agarbatti",
    slug: "sandalwood-agarbatti",
    description: null,
    brand: "Cycle",
    weight: "100g",
    productType: null,
    sku: "CYC-INC-001",
    price: 12000,
    images: JSON.stringify(["/uploads/a.jpg"]),
    inStock: true,
    featured: false,
    isHidden: false,
    categoryId: "cat-1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: {
      id: "cat-1",
      name: "Incense Sticks",
      slug: "incense-sticks",
      description: null,
      image: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    variants: [{ id: "v1", label: "100g", price: 12000, inStock: true, productId: "p1", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") }],
  };

  it("PATCHes the full product payload with isHidden inverted and invalidates the products cache", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ...product, isHidden: true }));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useToggleProductHidden(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(product);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/products/p1", expect.objectContaining({ method: "PATCH" }));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.isHidden).toBe(true);
    expect(body.images).toEqual(["/uploads/a.jpg"]);
    expect(body.variants).toEqual([{ label: "100g", price: 12000, inStock: true }]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });

  it("flips isHidden: true back to false when un-hiding", async () => {
    const hiddenProduct = { ...product, isHidden: true };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ...hiddenProduct, isHidden: false }));
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useToggleProductHidden(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(hiddenProduct);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.isHidden).toBe(false);
  });
});

describe("useDeleteProduct", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  function seedListCache(queryClient: QueryClient) {
    queryClient.setQueryData(["products", { page: 1 }], {
      items: [
        { id: "p1", name: "Sandalwood Agarbatti" },
        { id: "p2", name: "Rose Agarbatti" },
      ],
      total: 2,
    });
  }

  it("optimistically removes the deleted product from a cached list page and decrements total", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(jsonResponse(200, { success: true })), 10)
        )
    );
    const queryClient = new QueryClient();
    seedListCache(queryClient);

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("p1");

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ items: { id: string }[]; total: number }>([
        "products",
        { page: 1 },
      ]);
      expect(cached?.items.map((p) => p.id)).toEqual(["p2"]);
      expect(cached?.total).toBe(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic removal if the delete request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: "Server error" }));
    const queryClient = new QueryClient();
    seedListCache(queryClient);

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<{ items: { id: string }[]; total: number }>([
      "products",
      { page: 1 },
    ]);
    expect(cached?.items.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(cached?.total).toBe(2);
  });

  it("never lets the optimistic total go below zero", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(jsonResponse(200, { success: true })), 10)
        )
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(["products", { page: 1 }], {
      items: [{ id: "p1", name: "Sandalwood Agarbatti" }],
      total: 0, // already inconsistent/stale, guards the Math.max(0, ...) floor
    });

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate("p1");

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ total: number }>(["products", { page: 1 }]);
      expect(cached?.total).toBe(0);
    });
  });
});
