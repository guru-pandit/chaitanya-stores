import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/dialog";

type MutateFn = (
  id: string,
  opts: { onSuccess: () => void; onError: (err: unknown) => void; onSettled: () => void }
) => void;

export function useDeleteWithConfirm(mutate: MutateFn) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function confirmDelete(id: string, label: string) {
    const confirmed = await confirmDialog({
      title: "Delete",
      message: `Delete "${label}"? This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;
    setPendingId(id);
    mutate(id, {
      onSuccess: () => toast.success(`"${label}" deleted`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete"),
      onSettled: () => setPendingId(null),
    });
  }

  return { confirmDelete, pendingId };
}
