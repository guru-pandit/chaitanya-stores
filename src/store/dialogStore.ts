import { create } from "zustand";

export interface DialogRequest {
  id: string;
  type: "confirm" | "alert";
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "default" | "danger";
  resolve: (value: boolean) => void;
}

interface DialogState {
  dialog: DialogRequest | null;
  open: (request: Omit<DialogRequest, "id">) => void;
  close: (result: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  dialog: null,
  open: (request) => {
    const id = crypto.randomUUID();
    set({ dialog: { ...request, id } });
  },
  close: (result) => {
    get().dialog?.resolve(result);
    set({ dialog: null });
  },
}));
