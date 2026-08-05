import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApiFormErrors } from "./useApiFormErrors";
import { ApiError } from "@/lib/api-client";

describe("useApiFormErrors", () => {
  it("returns null and calls setError nothing when there is no error", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiFormErrors(null, setError));
    expect(result.current).toBeNull();
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns null for a non-ApiError failure — matches the prior string-only submitError behavior", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiFormErrors(new Error("network down"), setError));
    expect(result.current).toBeNull();
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns the message as a form-level fallback when the ApiError has no fieldErrors", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiFormErrors(new ApiError("Something went wrong"), setError));
    expect(result.current).toBe("Something went wrong");
    expect(setError).not.toHaveBeenCalled();
  });

  it("maps fieldErrors onto the form via setError and suppresses the generic fallback", () => {
    const setError = vi.fn();
    const error = new ApiError("Slug already in use", { slug: ["Slug already in use"] });
    const { result } = renderHook(() => useApiFormErrors(error, setError));

    expect(result.current).toBeNull();
    expect(setError).toHaveBeenCalledWith("slug", { type: "server", message: "Slug already in use" });
  });

  it("maps every field when multiple fieldErrors are present", () => {
    const setError = vi.fn();
    const error = new ApiError("Invalid", {
      name: ["Name is required"],
      slug: ["Slug is required"],
    });
    renderHook(() => useApiFormErrors(error, setError));

    expect(setError).toHaveBeenCalledWith("name", { type: "server", message: "Name is required" });
    expect(setError).toHaveBeenCalledWith("slug", { type: "server", message: "Slug is required" });
    expect(setError).toHaveBeenCalledTimes(2);
  });
});
