import { apiFetch } from "@/lib/api-client";

// `signal` lets a caller abandon a request whose `brand`/`categoryId` are
// already stale — see the SKU effect in ProductForm, where a late response
// from a half-typed brand used to overwrite the correct SKU.
export function generateSku(brand: string, categoryId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ brand, categoryId });
  return apiFetch<{ sku: string }>(`/api/products/generate-sku?${params}`, { signal });
}
