import { describe, it, expect } from "vitest";
import {
  toDateInputValue,
  formatPrice,
  variantPriceRange,
  formatVariantPrice,
  parseImages,
  slugify,
  buildSlug,
  buildSkuPrefix,
} from "./format";

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

describe("formatPrice", () => {
  it('returns "Contact for price" for null', () => {
    expect(formatPrice(null)).toBe("Contact for price");
  });

  it('returns "Contact for price" for undefined', () => {
    expect(formatPrice(undefined)).toBe("Contact for price");
  });

  it("formats paise as whole-rupee INR currency", () => {
    // 12000 paise -> ₹120
    expect(formatPrice(12000)).toBe("₹120");
  });

  it("formats zero paise as ₹0, distinct from the null/undefined 'Contact for price' case", () => {
    expect(formatPrice(0)).toBe("₹0");
  });

  it("rounds to the nearest whole rupee (maximumFractionDigits: 0)", () => {
    // 12050 paise = ₹120.50 -> rounds to ₹121 (Intl rounds half-to-even/away depending on engine,
    // but there must be no decimal point in the output either way)
    expect(formatPrice(12050)).not.toMatch(/\./);
  });
});

describe("variantPriceRange", () => {
  it("returns the same value for min and max when all variants share one price", () => {
    const range = variantPriceRange([{ price: 100 }, { price: 100 }]);
    expect(range).toEqual({ min: 100, max: 100 });
  });

  it("returns the min and max across differently priced variants", () => {
    const range = variantPriceRange([{ price: 300 }, { price: 100 }, { price: 200 }]);
    expect(range).toEqual({ min: 100, max: 300 });
  });

  it("handles a single variant", () => {
    expect(variantPriceRange([{ price: 500 }])).toEqual({ min: 500, max: 500 });
  });
});

describe("formatVariantPrice", () => {
  it("formats a single price without a range dash when min === max", () => {
    expect(formatVariantPrice([{ price: 12000 }, { price: 12000 }])).toBe(formatPrice(12000));
  });

  it("formats a min–max range when prices differ", () => {
    const result = formatVariantPrice([{ price: 10000 }, { price: 20000 }]);
    expect(result).toBe(`${formatPrice(10000)} – ${formatPrice(20000)}`);
  });
});

describe("parseImages", () => {
  it("parses a valid JSON array of image paths", () => {
    expect(parseImages('["/uploads/a.jpg","/uploads/b.jpg"]')).toEqual([
      "/uploads/a.jpg",
      "/uploads/b.jpg",
    ]);
  });

  it("parses an empty JSON array", () => {
    expect(parseImages("[]")).toEqual([]);
  });

  it("falls back to [] for malformed JSON instead of throwing", () => {
    expect(parseImages("not json")).toEqual([]);
  });

  it("falls back to [] when the JSON parses but isn't an array (e.g. an object)", () => {
    expect(parseImages('{"foo":"bar"}')).toEqual([]);
  });

  it("falls back to [] for an empty string input", () => {
    expect(parseImages("")).toEqual([]);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Sandalwood Agarbatti")).toBe("sandalwood-agarbatti");
  });

  it("strips characters outside [a-z0-9\\s-]", () => {
    expect(slugify("Rose & Jasmine!")).toBe("rose-jasmine");
  });

  it("trims leading/trailing whitespace before processing", () => {
    expect(slugify("  Camphor  ")).toBe("camphor");
  });

  it("collapses multiple consecutive hyphens/spaces into one", () => {
    expect(slugify("Dhoop   Sticks -- Premium")).toBe("dhoop-sticks-premium");
  });

  it("returns an empty string for input that is entirely stripped characters", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("preserves existing numbers", () => {
    expect(slugify("Pack of 10")).toBe("pack-of-10");
  });
});

describe("buildSlug", () => {
  it("joins slugified category, brand, and name with hyphens", () => {
    expect(buildSlug("Incense Sticks", "Cycle", "Sandalwood")).toBe(
      "incense-sticks-cycle-sandalwood"
    );
  });

  it("filters out empty segments (e.g. an empty brand) rather than leaving a stray hyphen", () => {
    expect(buildSlug("Incense Sticks", "", "Sandalwood")).toBe("incense-sticks-sandalwood");
  });

  it("filters out segments that slugify to empty (punctuation-only)", () => {
    expect(buildSlug("Incense Sticks", "!!!", "Sandalwood")).toBe("incense-sticks-sandalwood");
  });
});

describe("buildSkuPrefix", () => {
  it("builds a BRAND-CATEGORY prefix from the first 3 letters of each, uppercased", () => {
    expect(buildSkuPrefix("Cycle", "Incense")).toBe("CYC-INC");
  });

  it("strips non-letter characters before truncating", () => {
    expect(buildSkuPrefix("3M Brand", "Pooja-Kit")).toBe("MBR-POO");
  });

  it("handles a brand/category shorter than 3 letters without padding", () => {
    expect(buildSkuPrefix("Om", "Diya")).toBe("OM-DIY");
  });

  it("handles an all-non-letter brand/category as an empty code segment", () => {
    expect(buildSkuPrefix("123", "456")).toBe("-");
  });
});
