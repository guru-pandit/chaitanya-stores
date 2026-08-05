import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/generated/prisma/client";

export type CategoryWithCount = Category & { _count: { products: number } };

// Default limit is generously large: most callers (product form's category
// select, the products list filter dropdown) want the effectively-full set
// for a dropdown, not a paginated slice — only the admin Categories list
// page passes an explicit smaller `limit` to get real pagination controls.
export const useCategories = ({ page = 1, limit = 100 }: { page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ["categories", page, limit],
    queryFn: () =>
      apiFetch<{ items: CategoryWithCount[]; total: number }>(`/api/categories?${params.toString()}`),
  });
};
