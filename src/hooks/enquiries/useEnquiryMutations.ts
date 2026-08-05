import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { EnquiryWithProduct } from "./useEnquiries";

export const useUpdateEnquiryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiFetch<EnquiryWithProduct>(`/api/enquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enquiries"] }),
  });
};
