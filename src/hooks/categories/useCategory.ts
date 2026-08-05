import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/generated/prisma/client";

export const useCategory = (id: string) =>
  useQuery({
    queryKey: ["categories", id],
    queryFn: () => apiFetch<Category>(`/api/categories/${id}`),
    enabled: !!id,
  });
