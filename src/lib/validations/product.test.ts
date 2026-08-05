import { describe, it, expect } from "vitest";
import { productSchema, toProductData, type ProductInput } from "./product";

const valid: ProductInput = {
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "",
  brand: "Cycle",
  weight: "100g",
  productType: "Masala Sticks",
  sku: "CYC-INC-001",
  price: 12000,
  images: [],
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  variants: [],
};

describe("productSchema — productType", () => {
  it("accepts a missing productType", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude productType from the parsed object
    const { productType: _productType, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(true);
  });

  it("accepts an empty string productType", () => {
    expect(productSchema.safeParse({ ...valid, productType: "" }).success).toBe(true);
  });

  it("accepts a valid productType", () => {
    expect(productSchema.safeParse({ ...valid, productType: "Black Sticks" }).success).toBe(true);
  });

  it("rejects a productType over 50 characters", () => {
    const result = productSchema.safeParse({ ...valid, productType: "a".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("toProductData — productType", () => {
  it('maps an empty string productType to null', () => {
    expect(toProductData({ ...valid, productType: "" }).productType).toBeNull();
  });

  it("maps an undefined productType to null", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude productType from the input
    const { productType: _productType, ...rest } = valid;
    expect(toProductData(rest as ProductInput).productType).toBeNull();
  });

  it("passes a real productType value through unchanged", () => {
    expect(toProductData({ ...valid, productType: "Black Sticks" }).productType).toBe(
      "Black Sticks"
    );
  });
});
