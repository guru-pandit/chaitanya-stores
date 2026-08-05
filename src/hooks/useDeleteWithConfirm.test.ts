import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDeleteWithConfirm } from "./useDeleteWithConfirm";
import { confirmDialog } from "@/lib/dialog";
import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api-client";

vi.mock("@/lib/dialog", () => ({ confirmDialog: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("useDeleteWithConfirm", () => {
  beforeEach(() => {
    vi.mocked(confirmDialog).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("does not call mutate when the user cancels the confirm dialog", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(false);
    const mutate = vi.fn();
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it("calls mutate with the id when the user confirms", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true);
    const mutate = vi.fn();
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(mutate).toHaveBeenCalledWith("id-1", expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
      onSettled: expect.any(Function),
    }));
  });

  it("passes the confirm dialog a danger tone and a message naming the item", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(false);
    const mutate = vi.fn();
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "danger",
        message: expect.stringContaining("Sandalwood Agarbatti"),
      })
    );
  });

  it("sets pendingId while the mutation is in flight and clears it on settle", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true);
    let settle: () => void = () => {};
    const mutate = vi.fn((id, opts) => {
      settle = () => opts.onSettled();
    });
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(result.current.pendingId).toBe("id-1");

    act(() => settle());

    await waitFor(() => expect(result.current.pendingId).toBeNull());
  });

  it("shows a success toast naming the item when the mutation succeeds", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true);
    const mutate = vi.fn((id, opts) => opts.onSuccess());
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Sandalwood Agarbatti"));
  });

  it("shows the ApiError message on failure", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true);
    const mutate = vi.fn((id, opts) => opts.onError(new ApiError("Cannot delete: in use")));
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(toast.error).toHaveBeenCalledWith("Cannot delete: in use");
  });

  it("shows a generic failure message for a non-ApiError failure", async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true);
    const mutate = vi.fn((id, opts) => opts.onError(new Error("network down")));
    const { result } = renderHook(() => useDeleteWithConfirm(mutate));

    await act(async () => {
      await result.current.confirmDelete("id-1", "Sandalwood Agarbatti");
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to delete");
  });
});
