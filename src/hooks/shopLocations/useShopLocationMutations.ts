import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ShopLocationInput } from "@/lib/validations/shopLocation";
import type { ShopLocation } from "@/generated/prisma/client";

export const useCreateShopLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopLocationInput) =>
      apiFetch<ShopLocation>("/api/shop-locations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop-locations"] }),
  });
};

export const useUpdateShopLocation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopLocationInput) =>
      apiFetch<ShopLocation>(`/api/shop-locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop-locations"] }),
  });
};

export const useDeleteShopLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/shop-locations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop-locations"] }),
  });
};

// Flips a location to primary — sends its full current data back with
// isPrimary: true, since the API validates/persists the whole row on PATCH.
export const useSetPrimaryShopLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (location: ShopLocation) =>
      apiFetch<ShopLocation>(`/api/shop-locations/${location.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: location.name,
          address: location.address,
          phone: location.phone,
          whatsappNumber: location.whatsappNumber,
          email: location.email,
          isPrimary: true,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop-locations"] }),
  });
};
