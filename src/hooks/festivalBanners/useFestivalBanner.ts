import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { FestivalBanner } from "@/generated/prisma/client";

export const useFestivalBanner = (id: string) =>
  useQuery({
    queryKey: ["festival-banners", id],
    queryFn: () => apiFetch<FestivalBanner>(`/api/festival-banners/${id}`),
    enabled: !!id,
  });
