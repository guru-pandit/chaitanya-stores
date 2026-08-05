import { describe, it, expect } from "vitest";
import { productSchema, productVariantSchema, toProductData, type ProductInput } from "./product";

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

describe("productSchema — full valid input", () => {
  it("accepts a fully valid product", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a product with variants", () => {
    const result = productSchema.safeParse({
      ...valid,
      variants: [{ label: "100g", price: 12000, inStock: true }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null price (price on request)", () => {
    expect(productSchema.safeParse({ ...valid, price: null }).success).toBe(true);
  });

  it("accepts price omitted entirely (optional)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { price: _price, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(true);
  });
});

describe("productSchema — name", () => {
  it("rejects a missing name", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { name: _n, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(productSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("accepts a name at exactly the 150-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, name: "a".repeat(150) }).success).toBe(true);
  });

  it("rejects a name over the 150-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, name: "a".repeat(151) }).success).toBe(false);
  });
});

describe("productSchema — slug", () => {
  it("rejects a missing slug", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { slug: _s, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty slug", () => {
    expect(productSchema.safeParse({ ...valid, slug: "" }).success).toBe(false);
  });

  it.each(["Sandalwood-Agarbatti", "sandalwood_agarbatti", "sandalwood agarbatti", "-leading", "trailing-"])(
    "rejects a malformed slug %s",
    (slug) => {
      expect(productSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
  );
});

describe("productSchema — description", () => {
  it("accepts description omitted or empty", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { description: _d, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(true);
    expect(productSchema.safeParse({ ...valid, description: "" }).success).toBe(true);
  });

  it("accepts a description at exactly the 2000-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, description: "a".repeat(2000) }).success).toBe(true);
  });

  it("rejects a description over the 2000-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, description: "a".repeat(2001) }).success).toBe(false);
  });
});

describe("productSchema — brand", () => {
  it("rejects a missing brand", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { brand: _b, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty brand", () => {
    expect(productSchema.safeParse({ ...valid, brand: "" }).success).toBe(false);
  });

  it("accepts a brand at exactly the 100-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, brand: "a".repeat(100) }).success).toBe(true);
  });

  it("rejects a brand over the 100-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, brand: "a".repeat(101) }).success).toBe(false);
  });
});

describe("productSchema — weight", () => {
  it("accepts weight omitted or empty", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { weight: _w, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(true);
    expect(productSchema.safeParse({ ...valid, weight: "" }).success).toBe(true);
  });

  it("accepts a weight at exactly the 50-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, weight: "a".repeat(50) }).success).toBe(true);
  });

  it("rejects a weight over the 50-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, weight: "a".repeat(51) }).success).toBe(false);
  });
});

describe("productSchema — sku", () => {
  it("rejects a missing sku", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { sku: _s, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty sku", () => {
    expect(productSchema.safeParse({ ...valid, sku: "" }).success).toBe(false);
  });

  it("accepts a sku at exactly the 50-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, sku: "a".repeat(50) }).success).toBe(true);
  });

  it("rejects a sku over the 50-char boundary", () => {
    expect(productSchema.safeParse({ ...valid, sku: "a".repeat(51) }).success).toBe(false);
  });
});

describe("productSchema — price", () => {
  it("rejects zero", () => {
    expect(productSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(productSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it("rejects a non-integer price", () => {
    expect(productSchema.safeParse({ ...valid, price: 100.5 }).success).toBe(false);
  });

  it("accepts the smallest positive integer price", () => {
    expect(productSchema.safeParse({ ...valid, price: 1 }).success).toBe(true);
  });
});

describe("productSchema — images", () => {
  it("rejects a missing images field", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { images: _i, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-array images value", () => {
    expect(productSchema.safeParse({ ...valid, images: "not-an-array" }).success).toBe(false);
  });

  it("rejects an images array with non-string elements", () => {
    expect(productSchema.safeParse({ ...valid, images: [123] }).success).toBe(false);
  });
});

describe("productSchema — inStock / featured", () => {
  it("rejects a missing inStock", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { inStock: _is, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-boolean inStock", () => {
    expect(productSchema.safeParse({ ...valid, inStock: "yes" }).success).toBe(false);
  });

  it("rejects a missing featured", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { featured: _f, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-boolean featured", () => {
    expect(productSchema.safeParse({ ...valid, featured: "no" }).success).toBe(false);
  });
});

describe("productSchema — categoryId", () => {
  it("rejects a missing categoryId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { categoryId: _c, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty categoryId", () => {
    expect(productSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
  });
});

describe("productSchema — variants", () => {
  it("rejects a missing variants field", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { variants: _v, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-array variants value", () => {
    expect(productSchema.safeParse({ ...valid, variants: "not-an-array" }).success).toBe(false);
  });

  it("rejects a variant that fails productVariantSchema (e.g. zero price)", () => {
    const result = productSchema.safeParse({
      ...valid,
      variants: [{ label: "100g", price: 0, inStock: true }],
    });
    expect(result.success).toBe(false);
  });
});

describe("productVariantSchema", () => {
  const validVariant = { label: "100g", price: 12000, inStock: true };

  it("accepts a fully valid variant", () => {
    expect(productVariantSchema.safeParse(validVariant).success).toBe(true);
  });

  it("rejects an empty label", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, label: "" }).success).toBe(false);
  });

  it("accepts a label at exactly the 50-char boundary", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, label: "a".repeat(50) }).success).toBe(true);
  });

  it("rejects a label over the 50-char boundary", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, label: "a".repeat(51) }).success).toBe(false);
  });

  it("rejects a zero or negative price", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, price: 0 }).success).toBe(false);
    expect(productVariantSchema.safeParse({ ...validVariant, price: -5 }).success).toBe(false);
  });

  it("rejects a non-integer price", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, price: 10.5 }).success).toBe(false);
  });

  it("rejects a non-boolean inStock", () => {
    expect(productVariantSchema.safeParse({ ...validVariant, inStock: "true" }).success).toBe(false);
  });
});

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

describe("toProductData — images / weight / variants exclusion", () => {
  it("JSON-stringifies the images array for the Prisma scalar column", () => {
    const data = toProductData({ ...valid, images: ["/uploads/a.jpg", "/uploads/b.jpg"] });
    expect(data.images).toBe(JSON.stringify(["/uploads/a.jpg", "/uploads/b.jpg"]));
  });

  it("JSON-stringifies an empty images array as '[]'", () => {
    expect(toProductData({ ...valid, images: [] }).images).toBe("[]");
  });

  it("maps an empty string weight to null", () => {
    expect(toProductData({ ...valid, weight: "" }).weight).toBeNull();
  });

  it("passes a real weight value through unchanged", () => {
    expect(toProductData({ ...valid, weight: "250g" }).weight).toBe("250g");
  });

  it("excludes variants from the returned scalar payload — it's written separately as a relation", () => {
    const data = toProductData({
      ...valid,
      variants: [{ label: "100g", price: 12000, inStock: true }],
    });
    expect(data).not.toHaveProperty("variants");
  });

  it("passes through the other scalar fields unchanged", () => {
    const data = toProductData(valid);
    expect(data.name).toBe(valid.name);
    expect(data.slug).toBe(valid.slug);
    expect(data.brand).toBe(valid.brand);
    expect(data.sku).toBe(valid.sku);
    expect(data.price).toBe(valid.price);
    expect(data.inStock).toBe(valid.inStock);
    expect(data.featured).toBe(valid.featured);
    expect(data.categoryId).toBe(valid.categoryId);
  });
});
