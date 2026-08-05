import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ShopLocation } from "@/generated/prisma/client";

export const useShopLocation = (id: string) =>
  useQuery({
    queryKey: ["shop-locations", id],
    queryFn: () => apiFetch<ShopLocation>(`/api/shop-locations/${id}`),
    enabled: !!id,
  });
