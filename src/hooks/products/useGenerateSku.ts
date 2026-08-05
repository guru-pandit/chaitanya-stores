import { apiFetch } from "@/lib/api-client";

export function generateSku(brand: string, categoryId: string) {
  const params = new URLSearchParams({ brand, categoryId });
  return apiFetch<{ sku: string }>(`/api/products/generate-sku?${params}`);
}
