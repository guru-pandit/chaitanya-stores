import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/format";
import type { FestivalBannerInput } from "@/lib/validations/festivalBanner";
import type { FestivalBanner } from "@/generated/prisma/client";

export const useCreateFestivalBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FestivalBannerInput) =>
      apiFetch<FestivalBanner>("/api/festival-banners", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["festival-banners"] }),
  });
};

export const useUpdateFestivalBanner = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FestivalBannerInput) =>
      apiFetch<FestivalBanner>(`/api/festival-banners/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["festival-banners"] }),
  });
};

export const useDeleteFestivalBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/festival-banners/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["festival-banners"] }),
  });
};

// Flips a banner to active — sends its full current data back with
// isActive: true, since the API validates/persists the whole row on PATCH.
export const useSetActiveFestivalBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (banner: FestivalBanner) =>
      apiFetch<FestivalBanner>(`/api/festival-banners/${banner.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: banner.label,
          mediaType: banner.mediaType,
          mediaPath: banner.mediaPath,
          isActive: true,
          startDate: toDateInputValue(banner.startDate),
          endDate: toDateInputValue(banner.endDate),
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["festival-banners"] }),
  });
};
