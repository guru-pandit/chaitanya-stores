import { useDialogStore } from "@/store/dialogStore";

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      type: "confirm",
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? "Confirm",
      cancelLabel: opts.cancelLabel ?? "Cancel",
      tone: opts.tone ?? "default",
      resolve,
    });
  });
}

export function alertDialog(opts: { title: string; message: string; confirmLabel?: string }): Promise<void> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      type: "alert",
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? "OK",
      tone: "default",
      resolve: () => resolve(),
    });
  });
}
