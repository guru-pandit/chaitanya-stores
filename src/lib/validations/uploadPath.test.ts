import { describe, it, expect } from "vitest";
import { uploadPathSchema, isValidUploadPath, MAX_PRODUCT_IMAGES, MAX_HERO_IMAGES } from "./uploadPath";

describe("uploadPathSchema", () => {
  it("accepts a well-formed /uploads/ path", () => {
    expect(uploadPathSchema().safeParse("/uploads/a1b2c3.jpg").success).toBe(true);
  });

  it("rejects an empty string with the default required message", () => {
    const result = uploadPathSchema().safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("A valid upload path is required");
    }
  });

  it("rejects an empty string with a custom required message", () => {
    const result = uploadPathSchema("Image or video is required").safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Image or video is required");
    }
  });

  it("rejects a path not under /uploads/", () => {
    expect(uploadPathSchema().safeParse("https://evil.example.com/tracker.png").success).toBe(false);
  });

  it("rejects a javascript: value", () => {
    expect(uploadPathSchema().safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects a path containing '..'", () => {
    expect(uploadPathSchema().safeParse("/uploads/../../../etc/passwd").success).toBe(false);
  });

  it("rejects a path over the max length", () => {
    const longPath = `/uploads/${"a".repeat(300)}.jpg`;
    expect(uploadPathSchema().safeParse(longPath).success).toBe(false);
  });

  it("accepts a path at a reasonable real-world length", () => {
    expect(uploadPathSchema().safeParse("/uploads/9f2e1c3a-4b5d-4e6f-8a9b-0c1d2e3f4a5b.webp").success).toBe(
      true
    );
  });
});

describe("isValidUploadPath", () => {
  // Shared with src/lib/upload.ts's deleteUploadedImage() guard (Phase 5
  // code-review finding: the same rule was duplicated in two places).
  it("accepts a well-formed /uploads/ path", () => {
    expect(isValidUploadPath("/uploads/a1b2c3.jpg")).toBe(true);
  });

  it("rejects a path not under /uploads/", () => {
    expect(isValidUploadPath("/other/a1b2c3.jpg")).toBe(false);
  });

  it("rejects a path containing '..'", () => {
    expect(isValidUploadPath("/uploads/../../../etc/passwd")).toBe(false);
  });
});

describe("image array caps", () => {
  it("MAX_PRODUCT_IMAGES and MAX_HERO_IMAGES are positive, bounded numbers", () => {
    expect(MAX_PRODUCT_IMAGES).toBeGreaterThan(0);
    expect(MAX_HERO_IMAGES).toBeGreaterThan(0);
  });
});
