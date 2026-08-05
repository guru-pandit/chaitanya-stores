import { describe, it, expect } from "vitest";
import { siteSettingsSchema } from "./settings";

describe("siteSettingsSchema", () => {
  it("accepts an empty heroImages array", () => {
    expect(siteSettingsSchema.safeParse({ heroImages: [] }).success).toBe(true);
  });

  it("accepts a heroImages array of strings", () => {
    const result = siteSettingsSchema.safeParse({
      heroImages: ["/uploads/hero1.jpg", "/uploads/hero2.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing heroImages field", () => {
    expect(siteSettingsSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-array heroImages", () => {
    expect(siteSettingsSchema.safeParse({ heroImages: "/uploads/hero1.jpg" }).success).toBe(false);
  });

  it("rejects a heroImages array containing non-string elements", () => {
    expect(siteSettingsSchema.safeParse({ heroImages: [123] }).success).toBe(false);
  });
});
