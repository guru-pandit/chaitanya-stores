import { describe, it, expect } from "vitest";
import { getPagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./pagination";

describe("getPagination", () => {
  it("defaults to page 1 and the given default limit when no params are present", () => {
    const result = getPagination(new URLSearchParams());
    expect(result).toEqual({ page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0, take: DEFAULT_PAGE_SIZE });
  });

  it("computes skip/take from an explicit page and limit", () => {
    const result = getPagination(new URLSearchParams({ page: "3", limit: "10" }));
    expect(result).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
  });

  it("clamps a limit above MAX_PAGE_SIZE", () => {
    const result = getPagination(new URLSearchParams({ limit: "9999" }));
    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it("falls back to page 1 for a non-numeric or zero/negative page", () => {
    expect(getPagination(new URLSearchParams({ page: "abc" })).page).toBe(1);
    expect(getPagination(new URLSearchParams({ page: "0" })).page).toBe(1);
    expect(getPagination(new URLSearchParams({ page: "-5" })).page).toBe(1);
  });

  it("falls back to the given default limit for a non-numeric or zero/negative limit", () => {
    expect(getPagination(new URLSearchParams({ limit: "abc" }), 15).limit).toBe(15);
    expect(getPagination(new URLSearchParams({ limit: "0" }), 15).limit).toBe(15);
  });

  it("floors a fractional page/limit", () => {
    const result = getPagination(new URLSearchParams({ page: "2.9", limit: "10.9" }));
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});
