import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SiteSettingsInput } from "@/lib/validations/settings";
import type { SiteSettings } from "@/generated/prisma/client";

export const useUpdateSiteSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SiteSettingsInput) =>
      apiFetch<SiteSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
};
