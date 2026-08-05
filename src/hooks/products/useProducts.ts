import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Product, Category, ProductVariant } from "@/generated/prisma/client";

export type ProductWithCategory = Product & { category: Category; variants: ProductVariant[] };

export const useProducts = (filters: {
  categoryId?: string;
  brand?: string;
  q?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      apiFetch<{ items: ProductWithCategory[]; total: number }>(`/api/products?${params.toString()}`),
  });
};
