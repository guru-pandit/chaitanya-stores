import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ProductInput } from "@/lib/validations/product";
import type { ProductWithCategory } from "@/hooks/products/useProducts";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) =>
      apiFetch<ProductWithCategory>("/api/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
};

export const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) =>
      apiFetch<ProductWithCategory>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

type ProductListPage = { items: ProductWithCategory[]; total: number };

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previous = queryClient.getQueriesData<ProductListPage>({ queryKey: ["products"] });
      // The "products" prefix is also used by useBrands (["products","brands"] -> string[]) and
      // useProduct (["products", id] -> a single ProductWithCategory) — only touch caches that
      // actually hold a { items, total } list page.
      queryClient.setQueriesData<ProductListPage>({ queryKey: ["products"] }, (data) =>
        data && Array.isArray(data.items)
          ? { items: data.items.filter((p) => p.id !== id), total: Math.max(0, data.total - 1) }
          : data
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
};
