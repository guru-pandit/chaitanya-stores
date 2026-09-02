import { describe, it, expect } from "vitest";
import { isProductDetailPath } from "./routes";

describe("isProductDetailPath", () => {
  it("is false for the catalog index itself", () => {
    expect(isProductDetailPath("/catalog")).toBe(false);
  });

  it("is true for a product slug under /catalog", () => {
    expect(isProductDetailPath("/catalog/sandalwood-agarbatti")).toBe(true);
  });

  it("is false for an unrelated path that merely shares the /catalog prefix", () => {
    expect(isProductDetailPath("/catalogue-2026")).toBe(false);
  });

  it("is false for other public routes", () => {
    expect(isProductDetailPath("/")).toBe(false);
    expect(isProductDetailPath("/categories/incense-sticks")).toBe(false);
    expect(isProductDetailPath("/contact")).toBe(false);
  });
});
