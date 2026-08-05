import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { FestivalBanner } from "@/generated/prisma/client";

export const useFestivalBanners = ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ["festival-banners", page, limit],
    queryFn: () =>
      apiFetch<{ items: FestivalBanner[]; total: number }>(`/api/festival-banners?${params.toString()}`),
  });
};
