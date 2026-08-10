import { describe, it, expect } from "vitest";
import { categorySchema } from "./category";

const valid = {
  name: "Incense Sticks",
  slug: "incense-sticks",
  description: "Traditional agarbatti in various fragrances.",
  image: "/uploads/incense.jpg",
};

describe("categorySchema", () => {
  it("accepts a fully valid category", () => {
    expect(categorySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional description/image omitted entirely", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { description: _d, image: _i, ...rest } = valid;
    expect(categorySchema.safeParse(rest).success).toBe(true);
  });

  it("accepts empty-string description/image (optional-or-literal-empty)", () => {
    expect(categorySchema.safeParse({ ...valid, description: "", image: "" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { name: _name, ...rest } = valid;
    expect(categorySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(categorySchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("accepts a name at exactly the 100-char boundary", () => {
    expect(categorySchema.safeParse({ ...valid, name: "a".repeat(100) }).success).toBe(true);
  });

  it("rejects a name over the 100-char boundary", () => {
    expect(categorySchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects a missing slug", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { slug: _slug, ...rest } = valid;
    expect(categorySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty slug", () => {
    expect(categorySchema.safeParse({ ...valid, slug: "" }).success).toBe(false);
  });

  it.each([
    "Incense-Sticks", // uppercase
    "incense_sticks", // underscore
    "incense sticks", // space
    "-incense-sticks", // leading hyphen
    "incense-sticks-", // trailing hyphen
    "incense--sticks", // double hyphen
  ])("rejects a malformed slug %s", (slug) => {
    expect(categorySchema.safeParse({ ...valid, slug }).success).toBe(false);
  });

  it("accepts a slug with numbers", () => {
    expect(categorySchema.safeParse({ ...valid, slug: "incense-sticks-2026" }).success).toBe(true);
  });

  it("accepts a description at exactly the 1000-char boundary", () => {
    expect(categorySchema.safeParse({ ...valid, description: "a".repeat(1000) }).success).toBe(true);
  });

  it("rejects a description over the 1000-char boundary", () => {
    expect(categorySchema.safeParse({ ...valid, description: "a".repeat(1001) }).success).toBe(false);
  });

  // Phase 5 code-review finding: image was the one upload-path field left
  // unconstrained while product.images/festivalBanner.mediaPath/
  // settings.heroImages all moved to uploadPathSchema (finding #7).
  it("rejects an image path not under /uploads/", () => {
    const result = categorySchema.safeParse({
      ...valid,
      image: "https://evil.example.com/tracker.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image path containing '..'", () => {
    const result = categorySchema.safeParse({ ...valid, image: "/uploads/../../../etc/passwd" });
    expect(result.success).toBe(false);
  });
});
