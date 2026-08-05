import { describe, it, expect, beforeEach } from "vitest";
import { confirmDialog, alertDialog } from "./dialog";
import { useDialogStore } from "@/store/dialogStore";

describe("confirmDialog", () => {
  beforeEach(() => {
    useDialogStore.setState({ dialog: null });
  });

  it("opens the store with a 'confirm' request carrying the given title/message", () => {
    void confirmDialog({ title: "Delete", message: 'Delete "Sandalwood"?' });
    const dialog = useDialogStore.getState().dialog;
    expect(dialog?.type).toBe("confirm");
    expect(dialog?.title).toBe("Delete");
    expect(dialog?.message).toBe('Delete "Sandalwood"?');
  });

  it("defaults confirmLabel/cancelLabel/tone when not provided", () => {
    void confirmDialog({ title: "Delete", message: "Sure?" });
    const dialog = useDialogStore.getState().dialog;
    expect(dialog?.confirmLabel).toBe("Confirm");
    expect(dialog?.cancelLabel).toBe("Cancel");
    expect(dialog?.tone).toBe("default");
  });

  it("passes through custom labels and tone", () => {
    void confirmDialog({
      title: "Delete",
      message: "Sure?",
      confirmLabel: "Yes, delete",
      cancelLabel: "No",
      tone: "danger",
    });
    const dialog = useDialogStore.getState().dialog;
    expect(dialog?.confirmLabel).toBe("Yes, delete");
    expect(dialog?.cancelLabel).toBe("No");
    expect(dialog?.tone).toBe("danger");
  });

  it("resolves true when the store closes with a confirmed result", async () => {
    const promise = confirmDialog({ title: "Delete", message: "Sure?" });
    useDialogStore.getState().close(true);
    await expect(promise).resolves.toBe(true);
  });

  it("resolves false when the store closes with a cancelled result", async () => {
    const promise = confirmDialog({ title: "Delete", message: "Sure?" });
    useDialogStore.getState().close(false);
    await expect(promise).resolves.toBe(false);
  });

  it("clears the dialog from the store once closed", () => {
    void confirmDialog({ title: "Delete", message: "Sure?" });
    useDialogStore.getState().close(true);
    expect(useDialogStore.getState().dialog).toBeNull();
  });
});

describe("alertDialog", () => {
  beforeEach(() => {
    useDialogStore.setState({ dialog: null });
  });

  it("opens the store with an 'alert' request and default confirmLabel 'OK'", () => {
    void alertDialog({ title: "Heads up", message: "Something happened" });
    const dialog = useDialogStore.getState().dialog;
    expect(dialog?.type).toBe("alert");
    expect(dialog?.confirmLabel).toBe("OK");
    expect(dialog?.tone).toBe("default");
  });

  it("resolves (with no value) once the store is closed", async () => {
    const promise = alertDialog({ title: "Heads up", message: "Something happened" });
    useDialogStore.getState().close(true);
    await expect(promise).resolves.toBeUndefined();
  });
});
