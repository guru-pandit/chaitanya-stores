import { describe, it, expect } from "vitest";
import { toDateInputValue } from "./format";

describe("toDateInputValue", () => {
  it("returns an empty string for null/undefined", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
  });

  it("formats a real Date instance as YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date("2026-10-20T00:00:00.000Z"))).toBe("2026-10-20");
  });

  it("formats an ISO date string the same way — the shape every value actually has after a JSON round-trip through apiFetch", () => {
    expect(toDateInputValue("2026-10-20T00:00:00.000Z")).toBe("2026-10-20");
  });
});
