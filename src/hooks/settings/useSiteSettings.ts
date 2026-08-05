import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SiteSettings } from "@/generated/prisma/client";

export const useSiteSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SiteSettings>("/api/settings"),
  });
