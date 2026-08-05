import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Enquiry } from "@/generated/prisma/client";

export type EnquiryWithProduct = Enquiry & {
  product: { id: string; name: string; slug: string } | null;
};

export const useEnquiries = ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ["enquiries", page, limit],
    queryFn: () =>
      apiFetch<{ items: EnquiryWithProduct[]; total: number }>(`/api/enquiries?${params.toString()}`),
  });
};
