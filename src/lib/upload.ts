import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isValidUploadPath } from "@/lib/validations/uploadPath";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const VIDEO_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const VIDEO_EXTENSION_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class UploadError extends Error {}

// The client-supplied `file.type` is just a header the caller sets — trivial
// to spoof with any HTTP client (see security-baseline.md's upload
// validation contract). Detecting the real type from the file's own magic
// bytes means the accept/reject decision — and the extension we save it
// under — reflects what the bytes actually are, not what the request claims.
function sniffFileSignature(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 4 && buffer.toString("hex", 0, 4) === "1a45dfa3") {
    return "video/webm";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return "video/mp4";
  }
  return null;
}

// Shared by saveUploadedImage/saveUploadedVideo — local filesystem storage,
// used in both dev and production (see architecture.md's Image Handling
// section) — kept behind these functions so callers only depend on the
// returned public path, not on how/where the bytes land.
async function saveUploadedFile(
  file: File,
  allowedTypes: Set<string>,
  extensionByType: Record<string, string>,
  maxSizeBytes: number,
  unsupportedTypeMessage: string,
  maxSizeMessage: string
): Promise<string> {
  if (!allowedTypes.has(file.type)) {
    throw new UploadError(unsupportedTypeMessage);
  }
  if (file.size > maxSizeBytes) {
    throw new UploadError(maxSizeMessage);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = sniffFileSignature(buffer);
  if (!detectedType || !allowedTypes.has(detectedType)) {
    throw new UploadError(unsupportedTypeMessage);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const extension = extensionByType[detectedType];
  const filename = `${crypto.randomUUID()}.${extension}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

export async function saveUploadedImage(file: File): Promise<string> {
  return saveUploadedFile(
    file,
    IMAGE_TYPES,
    IMAGE_EXTENSION_BY_TYPE,
    IMAGE_MAX_SIZE_BYTES,
    "Unsupported file type. Use JPEG, PNG, or WebP.",
    "File too large. Maximum size is 5MB."
  );
}

// Used only by the Festival Banner admin form, which lets an admin upload a
// short marketing/offer video instead of a greeting image.
export async function saveUploadedVideo(file: File): Promise<string> {
  return saveUploadedFile(
    file,
    VIDEO_TYPES,
    VIDEO_EXTENSION_BY_TYPE,
    VIDEO_MAX_SIZE_BYTES,
    "Unsupported file type. Use MP4 or WebM.",
    "File too large. Maximum size is 20MB."
  );
}

// Deletes a file previously returned by saveUploadedImage/saveUploadedVideo.
// Storage is long-lived on the production VPS disk (unlike Vercel's
// ephemeral filesystem), so removed files must be cleaned up explicitly or
// they accumulate forever. Only accepts paths under /uploads/ so a caller
// can never be tricked into deleting an arbitrary file on disk. Works for
// any file under /uploads/ regardless of type — it only ever unlinks by
// path, so the same function covers both images and videos.
export async function deleteUploadedImage(publicPath: string): Promise<void> {
  if (!isValidUploadPath(publicPath)) {
    throw new UploadError("Invalid upload path.");
  }

  const filename = publicPath.slice("/uploads/".length);
  if (!filename) {
    throw new UploadError("Invalid upload path.");
  }
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}
