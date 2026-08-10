import { describe, it, expect } from "vitest";
import { siteSettingsSchema } from "./settings";
import { MAX_HERO_IMAGES } from "@/lib/validations/uploadPath";

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

  it("rejects a heroImages entry that isn't under /uploads/", () => {
    const result = siteSettingsSchema.safeParse({
      heroImages: ["https://evil.example.com/tracker.png"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a heroImages entry containing '..'", () => {
    const result = siteSettingsSchema.safeParse({
      heroImages: ["/uploads/../../../etc/passwd"],
    });
    expect(result.success).toBe(false);
  });

  it(`accepts exactly ${MAX_HERO_IMAGES} hero images`, () => {
    const heroImages = Array.from({ length: MAX_HERO_IMAGES }, (_, i) => `/uploads/hero-${i}.jpg`);
    expect(siteSettingsSchema.safeParse({ heroImages }).success).toBe(true);
  });

  it(`rejects more than ${MAX_HERO_IMAGES} hero images`, () => {
    const heroImages = Array.from({ length: MAX_HERO_IMAGES + 1 }, (_, i) => `/uploads/hero-${i}.jpg`);
    expect(siteSettingsSchema.safeParse({ heroImages }).success).toBe(false);
  });
});
