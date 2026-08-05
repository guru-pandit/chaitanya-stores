import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export const useBrands = () =>
  useQuery({
    queryKey: ["products", "brands"],
    queryFn: () => apiFetch<string[]>("/api/products/brands"),
  });
