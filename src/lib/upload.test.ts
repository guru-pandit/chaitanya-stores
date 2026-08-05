import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import { deleteUploadedImage, saveUploadedImage, saveUploadedVideo, UploadError } from "@/lib/upload";

vi.mock("fs/promises", () => {
  const fns = { writeFile: vi.fn(), mkdir: vi.fn(), unlink: vi.fn() };
  return { ...fns, default: fns };
});

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Real magic bytes for each format — the sniffing added to saveUploadedFile
// (see ID-006) inspects the actual bytes, so a fixture with plain text
// content is no longer accepted just because the client declared a matching
// Content-Type.
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const MP4_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
]);

describe("deleteUploadedImage", () => {
  beforeEach(() => {
    vi.mocked(unlink).mockReset();
  });

  it("unlinks the file under public/uploads for a valid /uploads/ path", async () => {
    vi.mocked(unlink).mockResolvedValueOnce(undefined);

    await deleteUploadedImage("/uploads/abc123.jpg");

    expect(unlink).toHaveBeenCalledWith(path.join(UPLOAD_DIR, "abc123.jpg"));
  });

  it("rejects a path that isn't under /uploads/", async () => {
    await expect(deleteUploadedImage("/etc/passwd")).rejects.toThrow(UploadError);
    expect(unlink).not.toHaveBeenCalled();
  });

  it("rejects a path containing '..' even if it starts with /uploads/", async () => {
    await expect(deleteUploadedImage("/uploads/../../etc/passwd")).rejects.toThrow(UploadError);
    expect(unlink).not.toHaveBeenCalled();
  });

  it("rejects the uploads directory itself (empty filename)", async () => {
    await expect(deleteUploadedImage("/uploads/")).rejects.toThrow(UploadError);
    expect(unlink).not.toHaveBeenCalled();
  });

  it("treats an already-missing file (ENOENT) as a no-op success", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    vi.mocked(unlink).mockRejectedValueOnce(enoent);

    await expect(deleteUploadedImage("/uploads/already-gone.jpg")).resolves.toBeUndefined();
  });

  it("rethrows unexpected filesystem errors", async () => {
    const eperm = Object.assign(new Error("permission denied"), { code: "EPERM" });
    vi.mocked(unlink).mockRejectedValueOnce(eperm);

    await expect(deleteUploadedImage("/uploads/locked.jpg")).rejects.toThrow("permission denied");
  });
});

describe("saveUploadedVideo", () => {
  beforeEach(() => {
    vi.mocked(writeFile).mockReset();
  });

  it("rejects an unsupported file type", async () => {
    const file = new File(["fake"], "clip.mov", { type: "video/quicktime" });
    await expect(saveUploadedVideo(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects a file over the 20MB limit", async () => {
    const bigContent = new Uint8Array(21 * 1024 * 1024);
    const file = new File([bigContent], "clip.mp4", { type: "video/mp4" });
    await expect(saveUploadedVideo(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("saves an mp4 under 20MB and returns its /uploads/ path", async () => {
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    const file = new File([MP4_BYTES], "clip.mp4", { type: "video/mp4" });

    const result = await saveUploadedVideo(file);

    expect(result).toMatch(/^\/uploads\/.+\.mp4$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("rejects a file whose declared Content-Type doesn't match its real bytes", async () => {
    // Plain text content, but the client declares it as a valid video type —
    // exactly the spoofing scenario ID-006 closes.
    const file = new File(["not actually a video"], "clip.mp4", { type: "video/mp4" });

    await expect(saveUploadedVideo(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });
});

describe("saveUploadedImage", () => {
  beforeEach(() => {
    vi.mocked(writeFile).mockReset();
  });

  it("rejects an unsupported declared type", async () => {
    const file = new File([JPEG_BYTES], "photo.gif", { type: "image/gif" });
    await expect(saveUploadedImage(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects a file over the 5MB limit", async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], "photo.jpg", { type: "image/jpeg" });
    await expect(saveUploadedImage(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects a file whose declared Content-Type doesn't match its real bytes (spoofed MIME)", async () => {
    // The exact repro from the QA report: a plain text file with the
    // Content-Type overridden to image/jpeg.
    const file = new File(["plain text, not a jpeg"], "evil.jpg", { type: "image/jpeg" });

    await expect(saveUploadedImage(file)).rejects.toThrow(UploadError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("saves a real JPEG and returns its /uploads/ path", async () => {
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    const file = new File([JPEG_BYTES], "photo.jpg", { type: "image/jpeg" });

    const result = await saveUploadedImage(file);

    expect(result).toMatch(/^\/uploads\/.+\.jpg$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("saves a real PNG and returns its /uploads/ path", async () => {
    vi.mocked(writeFile).mockResolvedValueOnce(undefined);
    const file = new File([PNG_BYTES], "photo.png", { type: "image/png" });

    const result = await saveUploadedImage(file);

    expect(result).toMatch(/^\/uploads\/.+\.png$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
