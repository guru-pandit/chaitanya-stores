import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { CategoryInput } from "@/lib/validations/category";
import type { Category } from "@/generated/prisma/client";
import type { CategoryWithCount } from "@/hooks/categories/useCategories";

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryInput) =>
      apiFetch<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useUpdateCategory = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryInput) =>
      apiFetch<Category>(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

type CategoryListPage = { items: CategoryWithCount[]; total: number };

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/categories/${id}`, { method: "DELETE" }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previous = queryClient.getQueriesData<CategoryListPage>({ queryKey: ["categories"] });
      // The "categories" prefix is also used by useCategory (["categories", id] -> a single
      // Category) — only touch caches that actually hold a { items, total } list page.
      queryClient.setQueriesData<CategoryListPage>({ queryKey: ["categories"] }, (data) =>
        data && Array.isArray(data.items)
          ? { items: data.items.filter((c) => c.id !== id), total: Math.max(0, data.total - 1) }
          : data
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
};
