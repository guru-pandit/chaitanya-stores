import { z } from "zod";

// Phase 4 audit finding #7: productSchema.images / festivalBannerSchema.
// mediaPath / siteSettingsSchema.heroImages each accepted arbitrary
// strings — traced consequences included malformed Open Graph/JSON-LD tags
// and a `javascript:` value crashing next/image's SSR validation (safely,
// but ungracefully). Every real value in these fields is a path returned
// by POST /api/upload or /api/upload/video (src/lib/upload.ts), which
// always starts with "/uploads/" and never contains "..". Constraining the
// Zod schema itself — not just src/lib/upload.ts's own write-time
// deleteUploadedImage() guard — closes the gap where a hand-crafted API
// request could persist something else entirely.
const MAX_UPLOAD_PATH_LENGTH = 300;

/**
 * The structural rule for "is this a real uploaded-file path" — shared
 * between this Zod schema and src/lib/upload.ts's deleteUploadedImage()
 * guard, which independently enforced the same two conditions before this
 * was extracted. One rule, one place to change it.
 */
export function isValidUploadPath(value: string): boolean {
  return value.startsWith("/uploads/") && !value.includes("..");
}

/**
 * Shared by product.images, festivalBanner.mediaPath, and
 * settings.heroImages. `requiredMessage` lets each domain keep its own
 * user-facing "required" copy (e.g. festivalBanner's "Image or video is
 * required") while sharing the same path-shape constraints.
 */
export function uploadPathSchema(requiredMessage = "A valid upload path is required") {
  return z
    .string()
    .min(1, requiredMessage)
    .max(MAX_UPLOAD_PATH_LENGTH, "Upload path is too long")
    .refine((value) => !value.includes(".."), {
      message: "Upload path may not contain '..'",
    })
    .refine((value) => value.startsWith("/uploads/"), {
      message: "Upload path must be under /uploads/",
    });
}

// Array-length caps (finding #7's "no cap" follow-on) — generous for this
// catalog's scale but bounded so a malicious/buggy client can't grow a
// single row's JSON column unbounded.
export const MAX_PRODUCT_IMAGES = 10;
export const MAX_HERO_IMAGES = 10;
