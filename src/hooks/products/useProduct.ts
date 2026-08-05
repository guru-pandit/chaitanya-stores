import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ProductWithCategory } from "@/hooks/products/useProducts";

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<ProductWithCategory>(`/api/products/${id}`),
    enabled: !!id,
  });
