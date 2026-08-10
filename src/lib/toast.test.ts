import { describe, it, expect, beforeEach } from "vitest";
import { toast } from "./toast";
import { useToastStore } from "@/store/toastStore";

describe("toast", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("success() adds a 'success' toast with the given message", () => {
    toast.success("Saved");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ type: "success", message: "Saved" });
  });

  it("error() adds an 'error' toast with the given message", () => {
    toast.error("Failed to save");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ type: "error", message: "Failed to save" });
  });

  it("appends multiple toasts rather than replacing", () => {
    toast.success("First");
    toast.error("Second");
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it("assigns each toast a distinct id", () => {
    toast.success("First");
    toast.success("Second");
    const [a, b] = useToastStore.getState().toasts;
    expect(a.id).not.toBe(b.id);
  });
});
