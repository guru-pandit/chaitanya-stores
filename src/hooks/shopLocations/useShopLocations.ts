import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ShopLocation } from "@/generated/prisma/client";

export const useShopLocations = ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ["shop-locations", page, limit],
    queryFn: () =>
      apiFetch<{ items: ShopLocation[]; total: number }>(`/api/shop-locations?${params.toString()}`),
  });
};
