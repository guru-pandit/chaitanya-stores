import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

// `next start` on a standalone build only serves the `public/` files that
// existed at boot, so a file uploaded afterwards 404s until a restart. In
// the Docker deploy nginx serves /uploads/ straight from the shared volume
// and never reaches this handler; it covers dev / non-nginx runs. Next
// still prefers a real file in public/ over this route when one exists.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Matches only names saveUploadedFile() generates (UUID + known extension),
// so no path separators or ".." can ever reach the filesystem call.
const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|webm)$/;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!FILENAME_PATTERN.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(UPLOAD_DIR, filename));
    const extension = filename.split(".").pop()!;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": CONTENT_TYPE_BY_EXTENSION[extension],
        "X-Content-Type-Options": "nosniff",
        // Filenames are random UUIDs and never rewritten, so safe to cache.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
